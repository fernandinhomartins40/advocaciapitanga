import { Router } from 'express';
import { DocumentoController, uploadMiddleware } from '../controllers/documento.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const documentoController = new DocumentoController();

router.get('/', authMiddleware, documentoController.getAll.bind(documentoController));
router.post('/', authMiddleware, uploadMiddleware, documentoController.upload.bind(documentoController));
router.get('/:id/download', authMiddleware, documentoController.download.bind(documentoController));
router.delete('/:id', authMiddleware, documentoController.delete.bind(documentoController));

export default router;
