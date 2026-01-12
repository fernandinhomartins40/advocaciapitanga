import { Router } from 'express';
import { ProjudiController } from '../controllers/projudi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const projudiController = new ProjudiController();

// Rate limiter especifico para consultas PROJUDI
const projudiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // Maximo 5 consultas por 5 minutos
  message: 'Muitas consultas ao PROJUDI. Aguarde alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter mais restritivo para iniciar captcha
const captchaRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutos
  max: 3, // Maximo 3 tentativas
  message: 'Aguarde antes de solicitar novo CAPTCHA',
});

/**
 * GET /projudi/status
 * Verifica status da integracao PROJUDI
 */
router.get(
  '/status',
  authMiddleware,
  projudiController.getStatus.bind(projudiController)
);

/**
 * POST /projudi/processos/:id/iniciar-captcha
 * ESTRATEGIA 1 (SCRAPING): Inicia consulta e retorna CAPTCHA
 */
router.post(
  '/processos/:id/iniciar-captcha',
  authMiddleware,
  captchaRateLimiter,
  projudiController.iniciarCaptcha.bind(projudiController)
);

/**
 * POST /projudi/processos/:id/consultar-captcha
 * ESTRATEGIA 1 (SCRAPING): Consulta com CAPTCHA resolvido
 */
router.post(
  '/processos/:id/consultar-captcha',
  authMiddleware,
  projudiRateLimiter,
  projudiController.consultarComCaptcha.bind(projudiController)
);

/**
 * GET /projudi/processos/:id/movimentacoes
 * Busca movimentações do processo
 */
router.get(
  '/processos/:id/movimentacoes',
  authMiddleware,
  projudiController.buscarMovimentacoes.bind(projudiController)
);

/**
 * POST /projudi/auto-cadastro/iniciar-captcha
 * Inicia CAPTCHA para auto-cadastro (sem processo existente)
 */
router.post(
  '/auto-cadastro/iniciar-captcha',
  authMiddleware,
  captchaRateLimiter,
  projudiController.iniciarCaptchaAutoCadastro.bind(projudiController)
);

/**
 * POST /projudi/processos/auto-cadastrar
 * Auto-cadastra processo consultando PROJUDI (cria Cliente, Partes e Processo)
 */
router.post(
  '/processos/auto-cadastrar',
  authMiddleware,
  projudiRateLimiter,
  projudiController.autoCadastrarProcessoComCaptcha.bind(projudiController)
);

/**
 * GET /projudi/testar
 * Testa configuracao da integracao
 */
router.get(
  '/testar',
  authMiddleware,
  projudiController.testarConfiguracao.bind(projudiController)
);

/**
 * GET /projudi/limite
 * Obtem informacoes sobre o limite de consultas do usuario
 */
router.get(
  '/limite',
  authMiddleware,
  projudiController.obterInfoLimite.bind(projudiController)
);

/**
 * POST /projudi/resetar-limite
 * Reseta o limite de consultas (apenas admins)
 */
router.post(
  '/resetar-limite',
  authMiddleware,
  projudiController.resetarLimite.bind(projudiController)
);

export default router;
