import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger';
import { captureRequestError } from '../utils/error-tracker';

/**
 * Middleware global de tratamento de erros
 *
 * Responsabilidades:
 * - Logar erros de forma estruturada
 * - Enviar erros para o Sentry (error tracking)
 * - Retornar resposta apropriada ao cliente
 * - Proteger informações sensíveis em produção
 *
 * Ordem de execução:
 * 1. Log estruturado do erro
 * 2. Captura no Sentry
 * 3. Resposta HTTP ao cliente
 */
export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Usar logger da requisição se disponível, senão usar logger global
  const reqLogger = (req as any).logger || require('../utils/logger').logger;

  const statusCode = err.statusCode || 500;
  const isOperationalError = err.isOperational || statusCode < 500;

  // Log estruturado do erro
  logError(reqLogger, 'Request error', err, {
    statusCode,
    isOperationalError,
    method: req.method,
    url: req.url,
    requestId: (req as any).id,
    userId: (req as any).user?.id,
  });

  // Capturar erro no Sentry (apenas erros de servidor ou não operacionais)
  if (!isOperationalError || statusCode >= 500) {
    try {
      captureRequestError(err, req);
    } catch (sentryError) {
      reqLogger.error('Erro ao enviar para Sentry', { error: sentryError });
    }
  }

  // Resposta ao cliente
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    error: {
      message: err.message || 'Erro interno do servidor',
      code: err.code,
      requestId: (req as any).id,
      // Stack trace apenas em desenvolvimento
      ...(isDevelopment && {
        stack: err.stack,
        details: err.details,
      }),
    },
  });
};
