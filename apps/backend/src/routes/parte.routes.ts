import { Router } from 'express';
import { ParteController } from '../controllers/parte.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const parteController = new ParteController();

/**
 * GET /partes
 * Lista todas as partes cadastradas (para reutilização)
 */
router.get(
  '/',
  authMiddleware,
  parteController.getAll.bind(parteController)
);

export default router;
