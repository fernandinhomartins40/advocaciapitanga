import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './utils/logger';
import { ensureDatabaseReady } from './utils/init-database';

const PORT = process.env.PORT || 3001;

/**
 * Inicializa o servidor garantindo que o banco de dados está pronto
 */
async function startServer() {
  try {
    // Garantir que o banco de dados está pronto e inicializado
    await ensureDatabaseReady();

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Backend rodando na porta ${PORT}`);
      logger.info(`📝 Ambiente: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API disponível em: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();
