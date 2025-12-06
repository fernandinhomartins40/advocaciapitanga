import { Router } from 'express';
import { IAController } from '../controllers/ia.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const iaController = new IAController();

// Apenas advogados podem usar IA
router.post('/gerar-peca', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.gerarPeca.bind(iaController));
router.post('/exportar-pdf', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.exportarPDF.bind(iaController));
router.post('/exportar-docx', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.exportarDOCX.bind(iaController));
router.post('/exportar-txt', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.exportarTXT.bind(iaController));
router.post('/exportar-rtf', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.exportarRTF.bind(iaController));
router.post('/analisar-documento', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.analisarDocumento.bind(iaController));
router.get('/historico', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.listarHistorico.bind(iaController));
router.get('/documento/:id', authMiddleware, requireRole(['ADVOGADO', 'ADMIN_ESCRITORIO']), iaController.buscarDocumento.bind(iaController));

export default router;
