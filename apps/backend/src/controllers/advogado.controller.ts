import { Response, NextFunction } from 'express';
import { prisma } from 'database';
import { AuthRequest } from '../types';
import { hashPassword } from '../utils/bcrypt';

export class AdvogadoController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const advogado = await prisma.advogado.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nome: true,
              createdAt: true,
            }
          }
        }
      });

      if (!advogado) {
        return res.status(404).json({ error: 'Advogado não encontrado' });
      }

      res.json(advogado);
    } catch (error: any) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { nome, oab, telefone } = req.body;

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(404).json({ error: 'Advogado não encontrado' });
      }

      const updated = await prisma.advogado.update({
        where: { id: advogado.id },
        data: {
          oab,
          telefone,
          ...(nome && {
            user: {
              update: {
                nome
              }
            }
          })
        },
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

      res.json(updated);
    } catch (error: any) {
      next(error);
    }
  }

  async updatePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { senhaAtual, novaSenha } = req.body;

      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar senha atual
      const { comparePassword } = await import('../utils/bcrypt');
      const isValid = await comparePassword(senhaAtual, user.password);

      if (!isValid) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }

      // Atualizar senha
      const hashedNewPassword = await hashPassword(novaSenha);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error: any) {
      next(error);
    }
  }
}
