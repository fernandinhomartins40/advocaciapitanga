import { Router } from 'express';
import { ProcessoController } from '../controllers/processo.controller';
import { createProcessoValidator, updateProcessoValidator } from '../validators/processo.validator';
import { validate } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const processoController = new ProcessoController();

// Rotas acessíveis tanto por advogados quanto clientes (com filtros aplicados)
router.get('/', authMiddleware, processoController.getAll.bind(processoController));
router.get('/dashboard/stats', authMiddleware, requireRole(['ADVOGADO']), processoController.getDashboardStats.bind(processoController));
router.get('/:id', authMiddleware, processoController.getById.bind(processoController));

// Rotas apenas para advogados
router.post('/', authMiddleware, requireRole(['ADVOGADO']), createProcessoValidator, validate, processoController.create.bind(processoController));
router.put('/:id', authMiddleware, requireRole(['ADVOGADO']), updateProcessoValidator, validate, processoController.update.bind(processoController));
router.delete('/:id', authMiddleware, requireRole(['ADVOGADO']), processoController.delete.bind(processoController));

export default router;
