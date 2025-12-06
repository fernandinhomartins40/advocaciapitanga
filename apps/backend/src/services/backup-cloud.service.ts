import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface CloudConfig {
  provider: 'aws-s3' | 'google-cloud' | 'azure' | 'none';
  bucket?: string;
  region?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    serviceAccountPath?: string;
  };
}

export class BackupCloudService {
  private config: CloudConfig;

  constructor() {
    this.config = {
      provider: (process.env.CLOUD_BACKUP_PROVIDER as any) || 'none',
      bucket: process.env.CLOUD_BACKUP_BUCKET,
      region: process.env.CLOUD_BACKUP_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
    };
  }

  /**
   * Faz upload de um backup para o cloud storage configurado
   */
  async uploadBackup(localFilePath: string): Promise<void> {
    if (this.config.provider === 'none') {
      console.log('⚠️  Cloud backup desabilitado. Configure CLOUD_BACKUP_PROVIDER para habilitar.');
      return;
    }

    console.log(`☁️  Fazendo upload do backup para ${this.config.provider}...`);

    try {
      switch (this.config.provider) {
        case 'aws-s3':
          await this.uploadToS3(localFilePath);
          break;
        case 'google-cloud':
          await this.uploadToGCS(localFilePath);
          break;
        case 'azure':
          await this.uploadToAzure(localFilePath);
          break;
        default:
          throw new Error(`Provider não suportado: ${this.config.provider}`);
      }

      console.log('✅ Upload para cloud concluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao fazer upload para cloud:', error);
      throw error;
    }
  }

  /**
   * Upload para AWS S3
   * Requer: aws-cli instalado e configurado
   */
  private async uploadToS3(localFilePath: string): Promise<void> {
    if (!this.config.bucket) {
      throw new Error('CLOUD_BACKUP_BUCKET não configurado para AWS S3');
    }

    const filename = path.basename(localFilePath);
    const s3Key = `backups/${filename}`;

    // Verifica se aws-cli está disponível
    try {
      await execAsync('aws --version');
    } catch {
      throw new Error('AWS CLI não está instalado. Instale com: apt-get install awscli');
    }

    const command = `aws s3 cp "${localFilePath}" "s3://${this.config.bucket}/${s3Key}" --region ${this.config.region}`;

    await execAsync(command);
    console.log(`✓ Upload para S3: s3://${this.config.bucket}/${s3Key}`);
  }

  /**
   * Upload para Google Cloud Storage
   * Requer: gcloud/gsutil instalado e configurado
   */
  private async uploadToGCS(localFilePath: string): Promise<void> {
    if (!this.config.bucket) {
      throw new Error('CLOUD_BACKUP_BUCKET não configurado para Google Cloud');
    }

    const filename = path.basename(localFilePath);
    const gcsPath = `gs://${this.config.bucket}/backups/${filename}`;

    // Verifica se gsutil está disponível
    try {
      await execAsync('gsutil --version');
    } catch {
      throw new Error('Google Cloud SDK não está instalado. Instale com: curl https://sdk.cloud.google.com | bash');
    }

    const command = `gsutil cp "${localFilePath}" "${gcsPath}"`;

    await execAsync(command);
    console.log(`✓ Upload para GCS: ${gcsPath}`);
  }

  /**
   * Upload para Azure Blob Storage
   * Requer: azure-cli instalado e configurado
   */
  private async uploadToAzure(localFilePath: string): Promise<void> {
    if (!this.config.bucket) {
      throw new Error('CLOUD_BACKUP_BUCKET (container) não configurado para Azure');
    }

    const filename = path.basename(localFilePath);

    // Verifica se azure-cli está disponível
    try {
      await execAsync('az --version');
    } catch {
      throw new Error('Azure CLI não está instalado. Instale com: curl -sL https://aka.ms/InstallAzureCLIDeb | bash');
    }

    const command = `az storage blob upload --file "${localFilePath}" --container-name ${this.config.bucket} --name backups/${filename}`;

    await execAsync(command);
    console.log(`✓ Upload para Azure: ${this.config.bucket}/backups/${filename}`);
  }

  /**
   * Lista backups disponíveis no cloud
   */
  async listCloudBackups(): Promise<string[]> {
    if (this.config.provider === 'none') {
      return [];
    }

    try {
      switch (this.config.provider) {
        case 'aws-s3':
          return await this.listS3Backups();
        case 'google-cloud':
          return await this.listGCSBackups();
        case 'azure':
          return await this.listAzureBackups();
        default:
          return [];
      }
    } catch (error) {
      console.error('Erro ao listar backups do cloud:', error);
      return [];
    }
  }

  private async listS3Backups(): Promise<string[]> {
    if (!this.config.bucket) return [];

    const command = `aws s3 ls "s3://${this.config.bucket}/backups/" --region ${this.config.region}`;
    const { stdout } = await execAsync(command);

    return stdout
      .split('\n')
      .filter(line => line.includes('.sql'))
      .map(line => line.split(/\s+/).pop() || '')
      .filter(Boolean);
  }

  private async listGCSBackups(): Promise<string[]> {
    if (!this.config.bucket) return [];

    const command = `gsutil ls "gs://${this.config.bucket}/backups/"`;
    const { stdout } = await execAsync(command);

    return stdout
      .split('\n')
      .filter(line => line.includes('.sql'))
      .map(line => path.basename(line))
      .filter(Boolean);
  }

  private async listAzureBackups(): Promise<string[]> {
    if (!this.config.bucket) return [];

    const command = `az storage blob list --container-name ${this.config.bucket} --prefix backups/ --output tsv --query "[].name"`;
    const { stdout } = await execAsync(command);

    return stdout
      .split('\n')
      .filter(line => line.includes('.sql'))
      .map(line => path.basename(line))
      .filter(Boolean);
  }

  /**
   * Download de um backup do cloud
   */
  async downloadBackup(filename: string, destinationPath: string): Promise<void> {
    if (this.config.provider === 'none') {
      throw new Error('Cloud backup não configurado');
    }

    console.log(`⬇️  Baixando backup do cloud: ${filename}...`);

    try {
      switch (this.config.provider) {
        case 'aws-s3':
          await this.downloadFromS3(filename, destinationPath);
          break;
        case 'google-cloud':
          await this.downloadFromGCS(filename, destinationPath);
          break;
        case 'azure':
          await this.downloadFromAzure(filename, destinationPath);
          break;
      }

      console.log('✅ Download do cloud concluído!');
    } catch (error) {
      console.error('❌ Erro ao baixar do cloud:', error);
      throw error;
    }
  }

  private async downloadFromS3(filename: string, destinationPath: string): Promise<void> {
    if (!this.config.bucket) throw new Error('Bucket não configurado');

    const s3Key = `backups/${filename}`;
    const command = `aws s3 cp "s3://${this.config.bucket}/${s3Key}" "${destinationPath}" --region ${this.config.region}`;

    await execAsync(command);
  }

  private async downloadFromGCS(filename: string, destinationPath: string): Promise<void> {
    if (!this.config.bucket) throw new Error('Bucket não configurado');

    const gcsPath = `gs://${this.config.bucket}/backups/${filename}`;
    const command = `gsutil cp "${gcsPath}" "${destinationPath}"`;

    await execAsync(command);
  }

  private async downloadFromAzure(filename: string, destinationPath: string): Promise<void> {
    if (!this.config.bucket) throw new Error('Container não configurado');

    const command = `az storage blob download --container-name ${this.config.bucket} --name backups/${filename} --file "${destinationPath}"`;

    await execAsync(command);
  }

  /**
   * Remove backups antigos do cloud (mantém os N mais recentes)
   */
  async cleanOldCloudBackups(keepLast: number = 7): Promise<void> {
    if (this.config.provider === 'none') {
      return;
    }

    console.log(`🗑️  Limpando backups antigos do cloud (mantendo os ${keepLast} mais recentes)...`);

    const backups = await this.listCloudBackups();

    if (backups.length <= keepLast) {
      console.log(`✓ Total de backups no cloud: ${backups.length}/${keepLast}`);
      return;
    }

    // Ordena por data (assumindo formato backup_DBNAME_YYYYMMDD_HHMMSS.sql)
    const sortedBackups = backups.sort().reverse();
    const toDelete = sortedBackups.slice(keepLast);

    for (const backup of toDelete) {
      try {
        await this.deleteCloudBackup(backup);
        console.log(`   ✓ Removido do cloud: ${backup}`);
      } catch (error) {
        console.error(`   ✗ Erro ao remover ${backup}:`, error);
      }
    }

    console.log(`✅ Limpeza do cloud concluída.`);
  }

  private async deleteCloudBackup(filename: string): Promise<void> {
    switch (this.config.provider) {
      case 'aws-s3':
        await execAsync(`aws s3 rm "s3://${this.config.bucket}/backups/${filename}" --region ${this.config.region}`);
        break;
      case 'google-cloud':
        await execAsync(`gsutil rm "gs://${this.config.bucket}/backups/${filename}"`);
        break;
      case 'azure':
        await execAsync(`az storage blob delete --container-name ${this.config.bucket} --name backups/${filename}`);
        break;
    }
  }

  /**
   * Verifica se o cloud backup está configurado e funcional
   */
  async testConnection(): Promise<boolean> {
    if (this.config.provider === 'none') {
      console.log('ℹ️  Cloud backup não configurado');
      return false;
    }

    try {
      await this.listCloudBackups();
      console.log(`✅ Conexão com ${this.config.provider} funcionando!`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao conectar com ${this.config.provider}:`, error);
      return false;
    }
  }

  /**
   * Retorna informações sobre a configuração do cloud
   */
  getConfig() {
    return {
      provider: this.config.provider,
      bucket: this.config.bucket,
      region: this.config.region,
      enabled: this.config.provider !== 'none',
    };
  }
}

export const backupCloudService = new BackupCloudService();
