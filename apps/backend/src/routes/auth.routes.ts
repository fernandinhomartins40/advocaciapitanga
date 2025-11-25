import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { registerValidator, loginValidator } from '../validators/auth.validator';
import { validate } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', registerValidator, validate, authController.register.bind(authController));
router.post('/login', loginValidator, validate, authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.get('/me', authMiddleware, authController.getProfile.bind(authController));
router.post('/logout', authMiddleware, authController.logout.bind(authController));

export default router;
