import { Request, Response, NextFunction } from 'express';
import { createRequestLogger, startTimer } from '../utils/logger';

/**
 * Middleware que loga todas as requisições HTTP de forma estruturada
 *
 * Captura:
 * - Método HTTP, URL, headers
 * - Status code da resposta
 * - Duração da requisição
 * - Request ID, User ID, IP
 * - Tamanho da resposta
 *
 * O logger é anexado à requisição para uso em controllers/services
 */
export const httpLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Criar logger específico para esta requisição
  const reqLogger = createRequestLogger(req);

  // Anexar logger à requisição para uso posterior
  (req as any).logger = reqLogger;

  // Iniciar timer para medir duração
  const timer = startTimer();

  // Capturar tamanho original do método write
  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks: Buffer[] = [];

  // Interceptar write para capturar tamanho da resposta
  res.write = function(chunk: any, ...args: any[]): boolean {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    return originalWrite.apply(res, [chunk, ...args] as any);
  };

  // Interceptar end para logar quando a resposta terminar
  res.end = function(chunk: any, ...args: any[]): Response {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }

    const duration = timer();
    const responseSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

    // Determinar nível de log baseado no status code
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Log estruturado da requisição
    reqLogger[level]({
      msg: 'HTTP Request',
      http: {
        method: req.method,
        url: req.url,
        statusCode,
        duration_ms: duration,
        responseSize_bytes: responseSize,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
      },
    });

    return originalEnd.apply(res, [chunk, ...args] as any);
  };

  next();
};
