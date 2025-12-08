import { Router } from 'express';
import { DocumentoProcessoController } from '../controllers/documento-processo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const documentoProcessoController = new DocumentoProcessoController();

// Todas as rotas exigem autenticação e papel de advogado
router.post(
  '/',
  authMiddleware,
  requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']),
  documentoProcessoController.criar.bind(documentoProcessoController)
);

router.get(
  '/processo/:processoId',
  authMiddleware,
  requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']),
  documentoProcessoController.listarPorProcesso.bind(documentoProcessoController)
);

router.get(
  '/:id',
  authMiddleware,
  requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']),
  documentoProcessoController.buscar.bind(documentoProcessoController)
);

router.put(
  '/:id',
  authMiddleware,
  requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']),
  documentoProcessoController.atualizar.bind(documentoProcessoController)
);

router.post(
  '/:id/exportar',
  authMiddleware,
  requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']),
  documentoProcessoController.exportar.bind(documentoProcessoController)
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']),
  documentoProcessoController.deletar.bind(documentoProcessoController)
);

export default router;
