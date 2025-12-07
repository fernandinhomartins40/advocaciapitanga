import { Response } from 'express';
import { AuthRequest } from '../types';
import { backupService } from '../services/backup.service';
import { backupScheduler } from '../services/backup-scheduler.service';

export class BackupController {
  /**
   * Cria um backup manual do banco de dados
   * POST /api/backups
   */
  async createBackup(req: AuthRequest, res: Response) {
    try {
      console.log(`🔧 Backup manual solicitado por: ${req.user?.email || 'usuário desconhecido'}`);

      const backupInfo = await backupService.createBackup();

      res.status(201).json({
        success: true,
        message: 'Backup criado com sucesso',
        data: {
          filename: backupInfo.filename,
          size: backupInfo.size,
          sizeFormatted: this.formatBytes(backupInfo.size),
          createdAt: backupInfo.createdAt,
          isValid: backupInfo.isValid,
        },
      });
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar backup',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Lista todos os backups disponíveis
   * GET /api/backups
   */
  async listBackups(req: AuthRequest, res: Response) {
    try {
      const backups = await backupService.listBackups();

      res.status(200).json({
        success: true,
        data: backups.map(b => ({
          filename: b.filename,
          size: b.size,
          sizeFormatted: this.formatBytes(b.size),
          createdAt: b.createdAt,
          isValid: b.isValid,
        })),
      });
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar backups',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Obtém estatísticas de backup
   * GET /api/backups/stats
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      const stats = await backupService.getBackupStats();
      const schedulerStatus = backupScheduler.getStatus();

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          scheduler: schedulerStatus,
        },
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Obtém informações sobre um backup específico
   * GET /api/backups/:filename
   */
  async getBackupInfo(req: AuthRequest, res: Response) {
    try {
      const { filename } = req.params;

      const backupInfo = await backupService.getBackupInfo(filename);

      if (!backupInfo) {
        return res.status(404).json({
          success: false,
          message: 'Backup não encontrado',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          filename: backupInfo.filename,
          size: backupInfo.size,
          sizeFormatted: this.formatBytes(backupInfo.size),
          createdAt: backupInfo.createdAt,
          isValid: backupInfo.isValid,
        },
      });
    } catch (error) {
      console.error('Erro ao obter informações do backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter informações do backup',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Restaura um backup específico
   * POST /api/backups/:filename/restore
   *
   * ⚠️ ATENÇÃO: Esta operação irá sobrescrever o banco de dados atual!
   */
  async restoreBackup(req: AuthRequest, res: Response) {
    try {
      const { filename } = req.params;
      const { confirm } = req.body;

      if (!confirm) {
        return res.status(400).json({
          success: false,
          message: 'Confirmação necessária. Envie { "confirm": true } no corpo da requisição.',
        });
      }

      console.log(`⚠️  RESTORE solicitado por: ${req.user?.email || 'usuário desconhecido'}`);
      console.log(`📄 Arquivo: ${filename}`);

      await backupService.restoreBackup(filename);

      res.status(200).json({
        success: true,
        message: 'Backup restaurado com sucesso',
        data: {
          filename,
          restoredAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao restaurar backup',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Deleta um backup específico
   * DELETE /api/backups/:filename
   */
  async deleteBackup(req: AuthRequest, res: Response) {
    try {
      const { filename } = req.params;

      console.log(`🗑️  Deleção de backup solicitada por: ${req.user?.email || 'usuário desconhecido'}`);
      console.log(`📄 Arquivo: ${filename}`);

      await backupService.deleteBackup(filename);

      res.status(200).json({
        success: true,
        message: 'Backup deletado com sucesso',
        data: {
          filename,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao deletar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar backup',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Download de um backup específico
   * GET /api/backups/:filename/download
   */
  async downloadBackup(req: AuthRequest, res: Response) {
    try {
      const { filename } = req.params;

      const backupInfo = await backupService.getBackupInfo(filename);

      if (!backupInfo) {
        return res.status(404).json({
          success: false,
          message: 'Backup não encontrado',
        });
      }

      console.log(`⬇️  Download solicitado por: ${req.user?.email || 'usuário desconhecido'}`);
      console.log(`📄 Arquivo: ${filename}`);

      res.download(backupInfo.path, filename, (err) => {
        if (err) {
          console.error('Erro ao fazer download:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Erro ao fazer download do backup',
            });
          }
        }
      });
    } catch (error) {
      console.error('Erro ao processar download:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar download',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Obtém status do scheduler
   * GET /api/backups/scheduler/status
   */
  async getSchedulerStatus(req: AuthRequest, res: Response) {
    try {
      const status = backupScheduler.getStatus();

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Erro ao obter status do scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter status do scheduler',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
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
}

export const backupController = new BackupController();
