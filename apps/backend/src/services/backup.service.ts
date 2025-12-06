import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { format } from 'date-fns';

const execAsync = promisify(exec);

interface BackupConfig {
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  backupDir: string;
  maxBackups: number; // Número de backups a manter
}

interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  isValid: boolean;
}

export class BackupService {
  private config: BackupConfig;

  constructor() {
    // Configuração do banco de dados a partir das variáveis de ambiente
    const databaseUrl = process.env.DATABASE_URL || '';
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    this.config = {
      dbUser: urlMatch?.[1] || process.env.DB_USER || 'postgres',
      dbPassword: urlMatch?.[2] || process.env.DB_PASSWORD || 'postgres123',
      dbHost: urlMatch?.[3] || process.env.DB_HOST || 'localhost',
      dbPort: urlMatch?.[4] || process.env.DB_PORT || '5432',
      dbName: urlMatch?.[5]?.split('?')[0] || process.env.DB_NAME || 'advocacia_pitanga',
      backupDir: process.env.BACKUP_DIR || '/app/backups',
      maxBackups: parseInt(process.env.MAX_BACKUPS || '7', 10),
    };
  }

  /**
   * Cria o diretório de backup se não existir
   */
  private async ensureBackupDir(): Promise<void> {
    try {
      await fs.access(this.config.backupDir);
    } catch {
      await fs.mkdir(this.config.backupDir, { recursive: true });
      console.log(`📁 Diretório de backup criado: ${this.config.backupDir}`);
    }
  }

  /**
   * Gera o nome do arquivo de backup com timestamp
   */
  private generateBackupFilename(): string {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    return `backup_${this.config.dbName}_${timestamp}.sql`;
  }

  /**
   * Executa o backup do banco de dados PostgreSQL
   */
  async createBackup(): Promise<BackupInfo> {
    console.log('🔄 Iniciando backup do banco de dados...');

    await this.ensureBackupDir();

    const filename = this.generateBackupFilename();
    const backupPath = path.join(this.config.backupDir, filename);

    // Comando pg_dump com todas as opções necessárias
    const command = `PGPASSWORD="${this.config.dbPassword}" pg_dump \
      -h ${this.config.dbHost} \
      -p ${this.config.dbPort} \
      -U ${this.config.dbUser} \
      -d ${this.config.dbName} \
      --format=plain \
      --no-owner \
      --no-acl \
      --clean \
      --if-exists \
      --verbose \
      > "${backupPath}"`;

    try {
      const { stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      });

      // pg_dump envia informações para stderr mesmo em caso de sucesso
      if (stderr && !stderr.includes('pg_dump: warning')) {
        console.log(`ℹ️  pg_dump output: ${stderr}`);
      }

      // Verifica se o arquivo foi criado e tem conteúdo
      const stats = await fs.stat(backupPath);
      const isValid = await this.validateBackup(backupPath);

      if (!isValid || stats.size < 1000) {
        throw new Error('Backup criado mas parece estar vazio ou inválido');
      }

      console.log(`✅ Backup criado com sucesso: ${filename} (${this.formatBytes(stats.size)})`);

      // Remove backups antigos
      await this.cleanOldBackups();

      return {
        filename,
        path: backupPath,
        size: stats.size,
        createdAt: new Date(),
        isValid: true,
      };
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);

      // Tenta remover arquivo de backup corrompido
      try {
        await fs.unlink(backupPath);
      } catch {}

      throw new Error(`Falha ao criar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Valida se o arquivo de backup contém dados válidos
   */
  private async validateBackup(backupPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(backupPath, 'utf-8');

      // Verifica se contém comandos SQL básicos
      const hasCreateTable = content.includes('CREATE TABLE');
      const hasInsert = content.includes('INSERT INTO') || content.includes('COPY');
      const hasDatabaseDef = content.includes('PostgreSQL database dump');

      return hasDatabaseDef && (hasCreateTable || hasInsert);
    } catch (error) {
      console.error('Erro ao validar backup:', error);
      return false;
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  async listBackups(): Promise<BackupInfo[]> {
    await this.ensureBackupDir();

    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup_') && f.endsWith('.sql'));

      const backups: BackupInfo[] = await Promise.all(
        backupFiles.map(async (filename) => {
          const filePath = path.join(this.config.backupDir, filename);
          const stats = await fs.stat(filePath);
          const isValid = await this.validateBackup(filePath);

          return {
            filename,
            path: filePath,
            size: stats.size,
            createdAt: stats.mtime,
            isValid,
          };
        })
      );

      // Ordena por data de criação (mais recente primeiro)
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Remove backups antigos mantendo apenas os N mais recentes
   */
  private async cleanOldBackups(): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length <= this.config.maxBackups) {
      console.log(`📊 Total de backups: ${backups.length}/${this.config.maxBackups}`);
      return;
    }

    const backupsToDelete = backups.slice(this.config.maxBackups);

    console.log(`🗑️  Removendo ${backupsToDelete.length} backup(s) antigo(s)...`);

    for (const backup of backupsToDelete) {
      try {
        await fs.unlink(backup.path);
        console.log(`   ✓ Removido: ${backup.filename}`);
      } catch (error) {
        console.error(`   ✗ Erro ao remover ${backup.filename}:`, error);
      }
    }

    console.log(`✅ Limpeza concluída. Mantidos ${this.config.maxBackups} backups mais recentes.`);
  }

  /**
   * Restaura um backup específico
   */
  async restoreBackup(backupFilename: string): Promise<void> {
    const backupPath = path.join(this.config.backupDir, backupFilename);

    // Verifica se o arquivo existe
    try {
      await fs.access(backupPath);
    } catch {
      throw new Error(`Arquivo de backup não encontrado: ${backupFilename}`);
    }

    // Valida o backup antes de restaurar
    const isValid = await this.validateBackup(backupPath);
    if (!isValid) {
      throw new Error('Arquivo de backup inválido ou corrompido');
    }

    console.log(`🔄 Restaurando backup: ${backupFilename}...`);

    const command = `PGPASSWORD="${this.config.dbPassword}" psql \
      -h ${this.config.dbHost} \
      -p ${this.config.dbPort} \
      -U ${this.config.dbUser} \
      -d ${this.config.dbName} \
      -f "${backupPath}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 100,
      });

      if (stderr && !stderr.includes('NOTICE')) {
        console.log(`ℹ️  psql output: ${stderr}`);
      }

      console.log('✅ Backup restaurado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      throw new Error(`Falha ao restaurar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obtém informações sobre um backup específico
   */
  async getBackupInfo(backupFilename: string): Promise<BackupInfo | null> {
    const backups = await this.listBackups();
    return backups.find(b => b.filename === backupFilename) || null;
  }

  /**
   * Deleta um backup específico
   */
  async deleteBackup(backupFilename: string): Promise<void> {
    const backupPath = path.join(this.config.backupDir, backupFilename);

    try {
      await fs.unlink(backupPath);
      console.log(`✅ Backup deletado: ${backupFilename}`);
    } catch (error) {
      throw new Error(`Falha ao deletar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Formata bytes em formato legível
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtém estatísticas de backup
   */
  async getBackupStats() {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((acc, b) => acc + b.size, 0);

    return {
      totalBackups: backups.length,
      maxBackups: this.config.maxBackups,
      totalSize: this.formatBytes(totalSize),
      oldestBackup: backups[backups.length - 1]?.createdAt || null,
      latestBackup: backups[0]?.createdAt || null,
      backups: backups.map(b => ({
        filename: b.filename,
        size: this.formatBytes(b.size),
        createdAt: b.createdAt,
        isValid: b.isValid,
      })),
    };
  }
}

export const backupService = new BackupService();
