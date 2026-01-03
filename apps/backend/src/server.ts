import dotenv from 'dotenv';
dotenv.config();

// Inicializar Sentry o mais cedo possível
import { initErrorTracking, flushErrorTracking } from './utils/error-tracker';
initErrorTracking();

import app from './app';
import { logger } from './utils/logger';
import { ensureDatabaseReady } from './utils/init-database';
import { backupScheduler } from './services/backup-scheduler.service';
import { initCleanupJob } from './jobs/cleanup-temp-files.job';

const PORT = parseInt(process.env.PORT || '3001', 10);

/**
 * Inicializa o servidor garantindo que o banco de dados está pronto
 */
async function startServer() {
  try {
    // Garantir que o banco de dados está pronto e inicializado
    await ensureDatabaseReady();

    // Iniciar o scheduler de backups automáticos
    if (process.env.BACKUP_ENABLED !== 'false') {
      backupScheduler.start();
      logger.info('📦 Sistema de backup automático iniciado');
    } else {
      logger.info('📦 Sistema de backup automático desabilitado');
    }

    // Iniciar job de limpeza de arquivos temporários
    initCleanupJob();
    logger.info('🧹 Job de limpeza de arquivos temporários iniciado');

    // Iniciar servidor escutando em todas as interfaces (0.0.0.0)
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Backend rodando na porta ${PORT}`);
      logger.info(`📝 Ambiente: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API disponível em: http://localhost:${PORT}/api`);
    });

    // Tratamento de erros do servidor
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Porta ${PORT} já está em uso`);
      } else {
        logger.error({ msg: '❌ Erro no servidor', error });
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM recebido, encerrando servidor gracefully...');
      backupScheduler.stop();
      await flushErrorTracking();
      server.close(() => {
        logger.info('Servidor encerrado');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT recebido, encerrando servidor gracefully...');
      backupScheduler.stop();
      await flushErrorTracking();
      server.close(() => {
        logger.info('Servidor encerrado');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error({
      msg: '❌ Erro ao iniciar servidor',
      error,
      stack: error instanceof Error ? error.stack : 'N/A'
    });
    process.exit(1);
  }
}

// Tratamento global de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error({
    msg: '❌ Uncaught Exception',
    error,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    msg: '❌ Unhandled Rejection',
    reason,
    promise: String(promise)
  });
  process.exit(1);
});

// Iniciar servidor
startServer();
