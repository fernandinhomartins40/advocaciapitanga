import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from 'database';

export type Permission =
  | 'gerenciarUsuarios'
  | 'gerenciarTodosProcessos'
  | 'gerenciarProcessosProprios'
  | 'visualizarOutrosProcessos'
  | 'gerenciarClientes'
  | 'visualizarClientes'
  | 'gerenciarIA'
  | 'configurarSistema'
  | 'visualizarRelatorios'
  | 'exportarDados';

/**
 * Middleware para verificar permissões específicas
 * Usuários ADMIN_ESCRITORIO têm todas as permissões automaticamente
 * Outros roles verificam permissões no MembroEscritorio
 */
export const requirePermission = (permissions: Permission | Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // ADMIN_ESCRITORIO tem todas as permissões
      if (req.user.role === 'ADMIN_ESCRITORIO') {
        next();
        return;
      }

      // CLIENTE não tem permissões de escritório
      if (req.user.role === 'CLIENTE') {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }

      // Buscar permissões do membro no escritório
      const membro = await prisma.membroEscritorio.findUnique({
        where: { userId: req.user.userId },
      });

      if (!membro || !membro.ativo) {
        res.status(403).json({ error: 'Membro não encontrado ou inativo' });
        return;
      }

      // Verificar se tem a(s) permissão(ões) necessária(s)
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermission = requiredPermissions.every(
        (permission) => membro[permission] === true
      );

      if (!hasPermission) {
        res.status(403).json({ error: 'Sem permissão para esta ação' });
        return;
      }

      // Adicionar permissões ao request para uso posterior
      req.permissions = membro;
      next();
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};

/**
 * Middleware para verificar se é admin do escritório
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (req.user.role !== 'ADMIN_ESCRITORIO') {
      res.status(403).json({ error: 'Acesso restrito a administradores' });
      return;
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

/**
 * Middleware para verificar se o usuário pertence a um escritório
 */
export const requireEscritorio = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // ADMIN_ESCRITORIO deve ter um escritório associado
    if (req.user.role === 'ADMIN_ESCRITORIO') {
      const advogado = await prisma.advogado.findUnique({
        where: { userId: req.user.userId },
        include: { escritoriosAdmin: true },
      });

      if (!advogado || advogado.escritoriosAdmin.length === 0) {
        res.status(403).json({ error: 'Escritório não configurado' });
        return;
      }

      req.escritorioId = advogado.escritoriosAdmin[0].id;
      next();
      return;
    }

    // Outros membros devem estar vinculados
    const membro = await prisma.membroEscritorio.findUnique({
      where: { userId: req.user.userId },
      include: { escritorio: true },
    });

    if (!membro || !membro.ativo) {
      res.status(403).json({ error: 'Não vinculado a nenhum escritório' });
      return;
    }

    req.escritorioId = membro.escritorioId;
    next();
  } catch (error) {
    console.error('Erro ao verificar escritório:', error);
    res.status(500).json({ error: 'Erro ao verificar escritório' });
  }
};
