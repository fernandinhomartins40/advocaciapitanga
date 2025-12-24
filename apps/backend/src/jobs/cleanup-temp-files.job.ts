import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Job de limpeza de arquivos temporários
 * Remove arquivos com mais de 2 horas do diretório de uploads
 */
export function initCleanupJob() {
  // Executar a cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('[CLEANUP] Iniciando limpeza de arquivos temporários');

      const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

      if (!fs.existsSync(uploadsDir)) {
        logger.warn('[CLEANUP] Diretório de uploads não existe', { uploadsDir });
        return;
      }

      const files = fs.readdirSync(uploadsDir);
      const now = Date.now();
      const maxAge = 2 * 60 * 60 * 1000; // 2 horas em milissegundos
      let deletedCount = 0;
      let errorCount = 0;

      logger.info('[CLEANUP] Arquivos encontrados', { count: files.length });

      for (const file of files) {
        try {
          const filepath = path.join(uploadsDir, file);
          const stats = fs.statSync(filepath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > maxAge) {
            fs.unlinkSync(filepath);
            deletedCount++;
            logger.debug('[CLEANUP] Arquivo deletado', {
              file,
              age: `${Math.round(fileAge / 1000 / 60)}min`
            });
          }
        } catch (error) {
          errorCount++;
          logger.error('[CLEANUP] Erro ao deletar arquivo', { file, error });
        }
      }

      logger.info('[CLEANUP] Limpeza concluída', {
        total: files.length,
        deleted: deletedCount,
        errors: errorCount
      });
    } catch (error) {
      logger.error('[CLEANUP] Erro na execução do job de limpeza', { error });
    }
  });

  logger.info('[CLEANUP] Job de limpeza de arquivos temporários iniciado (executa a cada hora)');
}
