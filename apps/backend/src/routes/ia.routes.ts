import { Router } from 'express';
import { IAController } from '../controllers/ia.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const iaController = new IAController();

// Apenas advogados podem usar IA
router.post('/gerar-peca', authMiddleware, requireRole(['ADVOGADO']), iaController.gerarPeca.bind(iaController));
router.post('/exportar-pdf', authMiddleware, requireRole(['ADVOGADO']), iaController.exportarPDF.bind(iaController));
router.post('/exportar-docx', authMiddleware, requireRole(['ADVOGADO']), iaController.exportarDOCX.bind(iaController));
router.post('/analisar-documento', authMiddleware, requireRole(['ADVOGADO']), iaController.analisarDocumento.bind(iaController));

export default router;
