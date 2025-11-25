import { Router, Request, Response, NextFunction } from 'express';
import { ProcessoController } from '../controllers/processo.controller';
import { createProcessoValidator, updateProcessoValidator } from '../validators/processo.validator';
import { validate } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { AuthRequest } from '../types';

const router = Router();
const processoController = new ProcessoController();

// Rotas acessíveis tanto por advogados quanto clientes (com filtros aplicados)
router.get('/', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  processoController.getAll(req as AuthRequest, res, next));
router.get('/dashboard/stats', authMiddleware, requireRole(['ADVOGADO']), (req: Request, res: Response, next: NextFunction) =>
  processoController.getDashboardStats(req as AuthRequest, res, next));
router.get('/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  processoController.getById(req as AuthRequest, res, next));

// Rotas apenas para advogados
router.post('/', authMiddleware, requireRole(['ADVOGADO']), createProcessoValidator, validate, (req: Request, res: Response, next: NextFunction) =>
  processoController.create(req as AuthRequest, res, next));
router.put('/:id', authMiddleware, requireRole(['ADVOGADO']), updateProcessoValidator, validate, (req: Request, res: Response, next: NextFunction) =>
  processoController.update(req as AuthRequest, res, next));
router.delete('/:id', authMiddleware, requireRole(['ADVOGADO']), (req: Request, res: Response, next: NextFunction) =>
  processoController.delete(req as AuthRequest, res, next));

export default router;
