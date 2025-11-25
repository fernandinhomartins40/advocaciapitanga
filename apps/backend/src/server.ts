import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`🚀 Backend rodando na porta ${PORT}`);
  logger.info(`📝 Ambiente: ${process.env.NODE_ENV}`);
  logger.info(`🔗 API disponível em: http://localhost:${PORT}/api`);
});
