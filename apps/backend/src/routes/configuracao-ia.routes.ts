import { Router } from 'express';
import { ConfiguracaoIAController } from '../controllers/configuracao-ia.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const configuracaoIAController = new ConfiguracaoIAController();

// Apenas advogados podem acessar configurações de IA
router.get('/', authMiddleware, requireRole(['ADVOGADO']), configuracaoIAController.obterConfiguracao.bind(configuracaoIAController));
router.put('/', authMiddleware, requireRole(['ADVOGADO']), configuracaoIAController.atualizarConfiguracao.bind(configuracaoIAController));
router.post('/testar', authMiddleware, requireRole(['ADVOGADO']), configuracaoIAController.testarConexao.bind(configuracaoIAController));

export default router;
