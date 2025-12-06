import { Router } from 'express';
import { DocumentoController, uploadMiddleware } from '../controllers/documento.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const documentoController = new DocumentoController();

router.get('/', authMiddleware, documentoController.getAll.bind(documentoController));
router.post('/', authMiddleware, uploadMiddleware, documentoController.upload.bind(documentoController));
router.get('/pastas', authMiddleware, documentoController.listarPastas.bind(documentoController));
router.post('/pastas', authMiddleware, documentoController.criarPasta.bind(documentoController));
router.get('/modelos', authMiddleware, documentoController.listarModelos.bind(documentoController));
router.post('/modelos', authMiddleware, documentoController.criarModelo.bind(documentoController));
router.put('/modelos/:id', authMiddleware, documentoController.atualizarModelo.bind(documentoController));
router.post('/modelos/:id/duplicar', authMiddleware, documentoController.duplicarModelo.bind(documentoController));
router.delete('/modelos/:id', authMiddleware, documentoController.deletarModelo.bind(documentoController));
router.post('/modelos/:id/gerar', authMiddleware, documentoController.gerarDeModelo.bind(documentoController));
router.get('/:id/download', authMiddleware, documentoController.download.bind(documentoController));
router.get('/:id/historico', authMiddleware, documentoController.historico.bind(documentoController));
router.patch('/:id/status', authMiddleware, documentoController.atualizarStatus.bind(documentoController));
router.put('/:id', authMiddleware, documentoController.atualizarDocumento.bind(documentoController));
router.delete('/:id', authMiddleware, documentoController.delete.bind(documentoController));

export default router;
