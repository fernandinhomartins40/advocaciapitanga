import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest } from '../types';

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Tentar ler do cookie primeiro (httpOnly)
    let token = req.cookies?.accessToken;

    // Fallback para Authorization header (para compatibilidade)
    if (!token) {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const parts = authHeader.split(' ');

      if (parts.length !== 2) {
        return res.status(401).json({ error: 'Formato de token inválido' });
      }

      const [scheme, tokenFromHeader] = parts;

      if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token mal formatado' });
      }

      token = tokenFromHeader;
    }

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
