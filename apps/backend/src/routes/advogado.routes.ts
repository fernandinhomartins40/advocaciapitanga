import { Router } from 'express';
import { AdvogadoController } from '../controllers/advogado.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateEmailValidator, updatePasswordValidator, updateProfileValidator } from '../validators/advogado.validator';

const router = Router();
const advogadoController = new AdvogadoController();

// Rota para listar todos os advogados (disponível para advogados e admins)
router.get('/', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), advogadoController.getAll.bind(advogadoController));

// Rotas de perfil do advogado
router.get('/perfil', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), advogadoController.getProfile.bind(advogadoController));
router.put('/perfil', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), updateProfileValidator, validate, advogadoController.updateProfile.bind(advogadoController));
router.put('/perfil/senha', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), updatePasswordValidator, validate, advogadoController.updatePassword.bind(advogadoController));
router.put('/perfil/email', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), updateEmailValidator, validate, advogadoController.updateEmail.bind(advogadoController));

export default router;
