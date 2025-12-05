import { Request } from 'express';
import { MembroEscritorio } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  permissions?: MembroEscritorio;
  escritorioId?: string;
}

export interface ErrorResponse {
  error: string;
  details?: any;
}
