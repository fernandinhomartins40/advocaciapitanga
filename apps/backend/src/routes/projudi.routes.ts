import { Router } from 'express';
import { ProjudiController } from '../controllers/projudi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const projudiController = new ProjudiController();

// Rate limiter específico para consultas PROJUDI
const projudiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // Máximo 5 consultas por 5 minutos
  message: 'Muitas consultas ao PROJUDI. Aguarde alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter mais restritivo para iniciar captcha
const captchaRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutos
  max: 3, // Máximo 3 tentativas
  message: 'Aguarde antes de solicitar novo CAPTCHA',
});

/**
 * GET /projudi/status
 * Verifica status da integração PROJUDI
 */
router.get(
  '/status',
  authMiddleware,
  projudiController.getStatus.bind(projudiController)
);

/**
 * POST /projudi/processos/:id/iniciar-captcha
 * ESTRATÉGIA 1 (SCRAPING): Inicia consulta e retorna CAPTCHA
 */
router.post(
  '/processos/:id/iniciar-captcha',
  authMiddleware,
  captchaRateLimiter,
  projudiController.iniciarCaptcha.bind(projudiController)
);

/**
 * POST /projudi/processos/:id/consultar-captcha
 * ESTRATÉGIA 1 (SCRAPING): Consulta com CAPTCHA resolvido
 */
router.post(
  '/processos/:id/consultar-captcha',
  authMiddleware,
  projudiRateLimiter,
  projudiController.consultarComCaptcha.bind(projudiController)
);

/**
 * POST /projudi/processos/:id/sincronizar-api
 * ESTRATÉGIA 2 (API OFICIAL): Sincronizar via API SCMPP
 */
router.post(
  '/processos/:id/sincronizar-api',
  authMiddleware,
  projudiRateLimiter,
  projudiController.sincronizarViaAPI.bind(projudiController)
);

/**
 * GET /projudi/processos/:id/verificar-alteracoes
 * Verifica se há alterações no processo (via API oficial)
 */
router.get(
  '/processos/:id/verificar-alteracoes',
  authMiddleware,
  projudiController.verificarAlteracoes.bind(projudiController)
);

/**
 * GET /projudi/testar
 * Testa configuração da integração
 */
router.get(
  '/testar',
  authMiddleware,
  projudiController.testarConfiguracao.bind(projudiController)
);

export default router;
