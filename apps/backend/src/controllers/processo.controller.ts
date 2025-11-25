import { Response, NextFunction } from 'express';
import { ProcessoService } from '../services/processo.service';
import { AuthRequest } from '../types';
import { StatusProcesso } from 'database';

const processoService = new ProcessoService();

export class ProcessoController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query;
      const userRole = req.user!.role;
      const userId = req.user!.userId;

      let filters: any = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as StatusProcesso | undefined,
      };

      // Se for advogado, buscar pelo advogadoId
      if (userRole === 'ADVOGADO') {
        const { prisma } = await import('database');

        const advogado = await prisma.advogado.findUnique({
          where: { userId }
        });

        if (advogado) {
          filters.advogadoId = advogado.id;
        }
      }

      // Se for cliente, buscar pelo clienteId
      if (userRole === 'CLIENTE') {
        const { prisma } = await import('database');

        const cliente = await prisma.cliente.findUnique({
          where: { userId }
        });

        if (cliente) {
          filters.clienteId = cliente.id;
        }
      }

      const result = await processoService.getAll(filters);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const processo = await processoService.getById(id, userId, userRole);
      res.json(processo);
    } catch (error: any) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // Buscar advogadoId do usuário logado
      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem criar processos' });
      }

      const processo = await processoService.create({
        ...req.body,
        advogadoId: advogado.id
      });

      res.status(201).json(processo);
    } catch (error: any) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const processo = await processoService.update(id, req.body);
      res.json(processo);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await processoService.delete(id);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados têm acesso ao dashboard' });
      }

      const stats = await processoService.getDashboardStats(advogado.id);
      res.json(stats);
    } catch (error: any) {
      next(error);
    }
  }
}
