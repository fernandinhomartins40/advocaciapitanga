import { Response, NextFunction } from 'express';
import { prisma } from 'database';
import { AuthRequest } from '../types';
import { hashPassword } from '../utils/bcrypt';
import { AuditService, AuditAction } from '../services/audit.service';

export class AdvogadoController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const advogados = await prisma.advogado.findMany({
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
            }
          }
        },
        orderBy: {
          user: {
            nome: 'asc'
          }
        }
      });

      res.json({ advogados });
    } catch (error: any) {
      next(error);
    }
  }

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
        where: { userId },
        include: {
          user: true
        }
      });

      if (!advogado) {
        return res.status(404).json({ error: 'Advogado não encontrado' });
      }

      // Preparar valores antigos e novos para auditoria
      const oldValues = {
        nome: advogado.user.nome,
        oab: advogado.oab,
        telefone: advogado.telefone,
      };

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

      // Registrar auditoria
      const requestInfo = AuditService.getRequestInfo(req);
      await AuditService.createLog({
        userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'Advogado',
        entityId: advogado.id,
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify({ nome, oab, telefone }),
        ...requestInfo,
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

      // Registrar auditoria
      const requestInfo = AuditService.getRequestInfo(req);
      await AuditService.createLog({
        userId,
        action: AuditAction.PASSWORD_UPDATED,
        entityType: 'User',
        entityId: userId,
        ...requestInfo,
      });

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error: any) {
      next(error);
    }
  }

  async updateEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { email, senhaAtual } = req.body;

      if (!email || !senhaAtual) {
        return res.status(400).json({ error: 'Email e senha atual são obrigatórios' });
      }

      // Verificar se o usuário existe
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

      // Verificar se o email já está em uso por outro usuário
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Este email já está em uso' });
      }

      // Salvar email antigo para auditoria
      const oldEmail = user.email;

      // Atualizar email
      await prisma.user.update({
        where: { id: userId },
        data: { email }
      });

      // Registrar auditoria
      const requestInfo = AuditService.getRequestInfo(req);
      await AuditService.createLog({
        userId,
        action: AuditAction.EMAIL_UPDATED,
        entityType: 'User',
        entityId: userId,
        oldValue: oldEmail,
        newValue: email,
        ...requestInfo,
      });

      res.json({ message: 'Email atualizado com sucesso' });
    } catch (error: any) {
      next(error);
    }
  }
}
