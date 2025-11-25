import { Router } from 'express';
import { MensagemController } from '../controllers/mensagem.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const mensagemController = new MensagemController();

router.get('/processo/:processoId', authMiddleware, mensagemController.getByProcesso.bind(mensagemController));
router.get('/nao-lidas', authMiddleware, mensagemController.getNaoLidas.bind(mensagemController));
router.post('/', authMiddleware, mensagemController.create.bind(mensagemController));
router.patch('/:id/lida', authMiddleware, mensagemController.marcarComoLida.bind(mensagemController));
router.patch('/processo/:processoId/lidas', authMiddleware, mensagemController.marcarTodasComoLidas.bind(mensagemController));

export default router;
