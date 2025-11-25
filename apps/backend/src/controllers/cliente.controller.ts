import { Request, Response, NextFunction } from 'express';
import { ClienteService } from '../services/cliente.service';
import { AuthRequest } from '../types';

const clienteService = new ClienteService();

export class ClienteController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, page, limit } = req.query;

      const result = await clienteService.getAll(
        undefined,
        search as string,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cliente = await clienteService.getById(id);
      res.json(cliente);
    } catch (error: any) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await clienteService.create(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cliente = await clienteService.update(id, req.body);
      res.json(cliente);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await clienteService.delete(id);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // Buscar cliente pelo userId
      const { prisma } = await import('database');

      const cliente = await prisma.cliente.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nome: true,
            }
          }
        }
      });

      if (!cliente) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(cliente);
    } catch (error: any) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      const cliente = await prisma.cliente.findUnique({
        where: { userId }
      });

      if (!cliente) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const updated = await clienteService.update(cliente.id, req.body);
      res.json(updated);
    } catch (error: any) {
      next(error);
    }
  }
}
