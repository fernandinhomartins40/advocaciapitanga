import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware que adiciona um ID único para cada requisição
 * O Request ID permite rastrear uma requisição através de todo o sistema
 *
 * - Gera um UUID v4 se não existir um x-request-id no header
 * - Adiciona o requestId ao objeto da requisição
 * - Retorna o x-request-id no header da resposta
 *
 * Útil para:
 * - Correlacionar logs de uma mesma requisição
 * - Debug e troubleshooting
 * - Rastreamento distribuído (distributed tracing)
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Usar o header x-request-id se existir, senão gerar um novo UUID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  // Adicionar ao header da requisição
  req.headers['x-request-id'] = requestId;

  // Adicionar ao objeto da requisição para fácil acesso
  (req as any).id = requestId;

  // Retornar no header da resposta
  res.setHeader('X-Request-ID', requestId);

  next();
};
