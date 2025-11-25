import { Router } from 'express';
import { AdvogadoController } from '../controllers/advogado.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const advogadoController = new AdvogadoController();

// Rotas de perfil do advogado
router.get('/perfil', authMiddleware, requireRole(['ADVOGADO']), advogadoController.getProfile.bind(advogadoController));
router.put('/perfil', authMiddleware, requireRole(['ADVOGADO']), advogadoController.updateProfile.bind(advogadoController));
router.put('/perfil/senha', authMiddleware, requireRole(['ADVOGADO']), advogadoController.updatePassword.bind(advogadoController));

export default router;
