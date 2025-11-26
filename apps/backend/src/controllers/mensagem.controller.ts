import { Response, NextFunction } from 'express';
import { prisma } from 'database';
import { AuthRequest } from '../types';

export class MensagemController {
  async getByProcesso(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Verificar permissão
      const processo = await prisma.processo.findUnique({
        where: { id: processoId },
        include: {
          cliente: {
            include: {
              user: true
            }
          }
        }
      });

      if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      if (userRole === 'CLIENTE' && processo.cliente.user.id !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const mensagens = await prisma.mensagem.findMany({
        where: { processoId },
        orderBy: { createdAt: 'asc' }
      });

      res.json(mensagens);
    } catch (error: any) {
      next(error);
    }
  }

  async getNaoLidas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      let where: any = {
        lida: false
      };

      if (userRole === 'ADVOGADO') {
        where.remetente = 'Cliente';

        const advogado = await prisma.advogado.findUnique({
          where: { userId }
        });

        if (advogado) {
          where.processo = {
            advogadoId: advogado.id
          };
        }
      } else {
        where.remetente = 'Advogado';

        const cliente = await prisma.cliente.findUnique({
          where: { userId }
        });

        if (cliente) {
          where.processo = {
            clienteId: cliente.id
          };
        }
      }

      const mensagens = await prisma.mensagem.findMany({
        where,
        include: {
          processo: {
            select: {
              numero: true,
              cliente: {
                include: {
                  user: {
                    select: {
                      nome: true
                    }
                  }
                }
              }
            }
          }
        },
        take: limit ? parseInt(limit as string) : 5,
        orderBy: { createdAt: 'desc' }
      });

      res.json(mensagens);
    } catch (error: any) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId, conteudo } = req.body;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      if (!processoId || !conteudo) {
        return res.status(400).json({ error: 'Processo e conteúdo são obrigatórios' });
      }

      // Verificar permissão
      const processo = await prisma.processo.findUnique({
        where: { id: processoId },
        include: {
          cliente: {
            include: {
              user: true
            }
          }
        }
      });

      if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      if (userRole === 'CLIENTE' && processo.cliente.user.id !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const mensagem = await prisma.mensagem.create({
        data: {
          conteudo,
          processoId,
          remetente: userRole === 'ADVOGADO' ? 'Advogado' : 'Cliente',
        }
      });

      res.status(201).json(mensagem);
    } catch (error: any) {
      next(error);
    }
  }

  async marcarComoLida(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const mensagem = await prisma.mensagem.update({
        where: { id },
        data: { lida: true }
      });

      res.json(mensagem);
    } catch (error: any) {
      next(error);
    }
  }

  async marcarTodasComoLidas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId } = req.params;
      const userRole = req.user!.role;

      await prisma.mensagem.updateMany({
        where: {
          processoId,
          remetente: userRole === 'ADVOGADO' ? 'Cliente' : 'Advogado',
          lida: false
        },
        data: { lida: true }
      });

      res.json({ message: 'Mensagens marcadas como lidas' });
    } catch (error: any) {
      next(error);
    }
  }
}
