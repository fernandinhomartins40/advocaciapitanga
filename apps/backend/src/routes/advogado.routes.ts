import { Router } from 'express';
import { AdvogadoController } from '../controllers/advogado.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateEmailValidator, updatePasswordValidator, updateProfileValidator } from '../validators/advogado.validator';

const router = Router();
const advogadoController = new AdvogadoController();

// Rotas de perfil do advogado
router.get('/perfil', authMiddleware, requireRole(['ADVOGADO']), advogadoController.getProfile.bind(advogadoController));
router.put('/perfil', authMiddleware, requireRole(['ADVOGADO']), updateProfileValidator, validate, advogadoController.updateProfile.bind(advogadoController));
router.put('/perfil/senha', authMiddleware, requireRole(['ADVOGADO']), updatePasswordValidator, validate, advogadoController.updatePassword.bind(advogadoController));
router.put('/perfil/email', authMiddleware, requireRole(['ADVOGADO']), updateEmailValidator, validate, advogadoController.updateEmail.bind(advogadoController));

export default router;
