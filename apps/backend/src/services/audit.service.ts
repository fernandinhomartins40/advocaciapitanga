import { prisma } from 'database';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';

export { AuditAction };

interface CreateAuditLogParams {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Cria um registro de auditoria
   */
  static async createLog(params: CreateAuditLogParams) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValue: params.oldValue,
          newValue: params.newValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }

  /**
   * Extrai informações da requisição para auditoria
   */
  static getRequestInfo(req: Request) {
    return {
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    };
  }

  /**
   * Busca logs de auditoria de um usuário
   */
  static async getUserLogs(userId: string, limit: number = 50) {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Busca logs de auditoria por ação
   */
  static async getLogsByAction(action: AuditAction, limit: number = 50) {
    return await prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Busca logs de auditoria em um período
   */
  static async getLogsByDateRange(startDate: Date, endDate: Date) {
    return await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
            role: true,
          },
        },
      },
    });
  }
}
