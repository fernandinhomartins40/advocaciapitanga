import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../types';

const authService = new AuthService();

// Configurações dos cookies
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS em produção
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

const ACCESS_TOKEN_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutos
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);

      // Definir cookies httpOnly
      res.cookie('accessToken', result.accessToken, ACCESS_TOKEN_OPTIONS);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      // Retornar usuário (sem tokens)
      res.status(201).json({ user: result.user });
    } catch (error: any) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // Definir cookies httpOnly
      res.cookie('accessToken', result.accessToken, ACCESS_TOKEN_OPTIONS);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      // Retornar usuário (sem tokens)
      res.json({ user: result.user });
    } catch (error: any) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token não encontrado' });
      }

      const result = await authService.refreshToken(refreshToken);

      // Atualizar access token
      res.cookie('accessToken', result.accessToken, ACCESS_TOKEN_OPTIONS);

      res.json({ user: result.user });
    } catch (error: any) {
      // Limpar cookies em caso de erro
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await authService.getProfile(userId);
      res.json(profile);
    } catch (error: any) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await authService.logout(userId);

      // Limpar cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error: any) {
      next(error);
    }
  }
}
