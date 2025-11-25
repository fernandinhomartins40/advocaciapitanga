import { Router } from 'express';
import { ClienteController } from '../controllers/cliente.controller';
import { createClienteValidator, updateClienteValidator } from '../validators/cliente.validator';
import { validate } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const clienteController = new ClienteController();

// Rotas para advogados (CRUD completo)
router.get('/', authMiddleware, requireRole(['ADVOGADO']), clienteController.getAll.bind(clienteController));
router.get('/:id', authMiddleware, requireRole(['ADVOGADO']), clienteController.getById.bind(clienteController));
router.post('/', authMiddleware, requireRole(['ADVOGADO']), createClienteValidator, validate, clienteController.create.bind(clienteController));
router.put('/:id', authMiddleware, requireRole(['ADVOGADO']), updateClienteValidator, validate, clienteController.update.bind(clienteController));
router.delete('/:id', authMiddleware, requireRole(['ADVOGADO']), clienteController.delete.bind(clienteController));

// Rotas para cliente acessar seu próprio perfil
router.get('/perfil/me', authMiddleware, requireRole(['CLIENTE']), clienteController.getProfile.bind(clienteController));
router.put('/perfil/me', authMiddleware, requireRole(['CLIENTE']), updateClienteValidator, validate, clienteController.updateProfile.bind(clienteController));

export default router;
