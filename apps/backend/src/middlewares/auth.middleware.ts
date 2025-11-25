import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest } from '../types';

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Tentar ler do cookie primeiro (httpOnly)
    let token = req.cookies?.accessToken;

    // Fallback para Authorization header (para compatibilidade)
    if (!token) {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ error: 'Token não fornecido' });
        return;
      }

      const parts = authHeader.split(' ');

      if (parts.length !== 2) {
        res.status(401).json({ error: 'Formato de token inválido' });
        return;
      }

      const [scheme, tokenFromHeader] = parts;

      if (!/^Bearer$/i.test(scheme)) {
        res.status(401).json({ error: 'Token mal formatado' });
        return;
      }

      token = tokenFromHeader;
    }

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
