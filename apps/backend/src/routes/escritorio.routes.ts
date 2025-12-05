import { Router } from 'express';
import { EscritorioController } from '../controllers/escritorio.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { requireAdmin, requireEscritorio, requirePermission } from '../middlewares/permissions.middleware';

const router = Router();
const escritorioController = new EscritorioController();

// Todas as rotas requerem autenticação e não são para CLIENTE
const rolesPermitidos = ['ADMIN_ESCRITORIO', 'ADVOGADO', 'ASSISTENTE', 'ESTAGIARIO'];

// Obter dados do escritório
router.get(
  '/',
  authMiddleware,
  requireRole(rolesPermitidos),
  requireEscritorio,
  escritorioController.obterEscritorio.bind(escritorioController)
);

// Atualizar escritório (apenas admin)
router.put(
  '/',
  authMiddleware,
  requireAdmin,
  requireEscritorio,
  escritorioController.atualizarEscritorio.bind(escritorioController)
);

// Listar membros (qualquer membro pode ver)
router.get(
  '/membros',
  authMiddleware,
  requireRole(rolesPermitidos),
  requireEscritorio,
  escritorioController.listarMembros.bind(escritorioController)
);

// Adicionar membro (apenas admin ou com permissão gerenciarUsuarios)
router.post(
  '/membros',
  authMiddleware,
  requireRole(rolesPermitidos),
  requireEscritorio,
  async (req: any, res: any, next: any) => {
    // Verificar se é admin ou tem permissão
    if (req.user?.role === 'ADMIN_ESCRITORIO') {
      next();
    } else {
      requirePermission('gerenciarUsuarios')(req, res, next);
    }
  },
  escritorioController.adicionarMembro.bind(escritorioController)
);

// Atualizar permissões (apenas admin ou com permissão gerenciarUsuarios)
router.put(
  '/membros/:id/permissoes',
  authMiddleware,
  requireRole(rolesPermitidos),
  async (req: any, res: any, next: any) => {
    if (req.user?.role === 'ADMIN_ESCRITORIO') {
      next();
    } else {
      requirePermission('gerenciarUsuarios')(req, res, next);
    }
  },
  escritorioController.atualizarPermissoes.bind(escritorioController)
);

// Desativar membro (apenas admin ou com permissão gerenciarUsuarios)
router.patch(
  '/membros/:id/desativar',
  authMiddleware,
  requireRole(rolesPermitidos),
  async (req: any, res: any, next: any) => {
    if (req.user?.role === 'ADMIN_ESCRITORIO') {
      next();
    } else {
      requirePermission('gerenciarUsuarios')(req, res, next);
    }
  },
  escritorioController.desativarMembro.bind(escritorioController)
);

// Reativar membro (apenas admin ou com permissão gerenciarUsuarios)
router.patch(
  '/membros/:id/reativar',
  authMiddleware,
  requireRole(rolesPermitidos),
  async (req: any, res: any, next: any) => {
    if (req.user?.role === 'ADMIN_ESCRITORIO') {
      next();
    } else {
      requirePermission('gerenciarUsuarios')(req, res, next);
    }
  },
  escritorioController.reativarMembro.bind(escritorioController)
);

// Remover membro (apenas admin)
router.delete(
  '/membros/:id',
  authMiddleware,
  requireAdmin,
  escritorioController.removerMembro.bind(escritorioController)
);

export default router;
