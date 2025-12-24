/**
 * Exemplos práticos de uso do sistema de logging
 *
 * Este arquivo demonstra as melhores práticas de logging
 * implementadas na aplicação Advocacia Pitanga
 */

import { Request, Response } from 'express';
import {
  logger,
  createContextLogger,
  createRequestLogger,
  auditLogger,
  metricsLogger,
  startTimer,
  logError,
} from '../src/utils/logger';
import { metrics } from '../src/utils/metrics';
import { captureException, captureMessage, setUserContext } from '../src/utils/error-tracker';

// ============================================
// 1. LOGGING BÁSICO
// ============================================

function exemploLoggingBasico() {
  // Log simples
  logger.info('Aplicação iniciada');
  logger.warn('Limite de quota próximo');
  logger.error('Falha na operação');

  // Log estruturado (formato Pino)
  logger.info({
    msg: 'Usuário autenticado',
    userId: '123',
    email: 'user@example.com',
    timestamp: new Date(),
  });
}

// ============================================
// 2. CHILD LOGGER (Logger com Contexto)
// ============================================

class UserService {
  // Logger específico do serviço
  private logger = createContextLogger({ service: 'UserService' });

  async createUser(data: any) {
    // Todos os logs incluirão automaticamente { service: 'UserService' }
    this.logger.info({ msg: 'Criando usuário', email: data.email });

    try {
      // ... criação do usuário
      this.logger.info({ msg: 'Usuário criado com sucesso', userId: '123' });
    } catch (error) {
      logError(this.logger, 'Erro ao criar usuário', error, { email: data.email });
      throw error;
    }
  }

  async updateUser(userId: string, data: any) {
    // Child logger do child logger - contexto aninhado
    const opLogger = this.logger.child({ operation: 'updateUser', userId });

    opLogger.info('Iniciando atualização');
    // ... atualização
    opLogger.info('Atualização concluída');
  }
}

// ============================================
// 3. REQUEST LOGGER (Logging em Controllers)
// ============================================

export const getUserController = async (req: Request, res: Response) => {
  // Logger já anexado pelo middleware
  const logger = (req as any).logger;

  const userId = req.params.id;

  logger.info({ msg: 'Buscando usuário', userId });

  try {
    // const user = await db.findUser(userId);

    logger.info({
      msg: 'Usuário encontrado',
      userId,
      // role: user.role
    });

    // res.json(user);
  } catch (error) {
    logError(logger, 'Erro ao buscar usuário', error, { userId });
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

// ============================================
// 4. TIMERS (Medição de Performance)
// ============================================

async function exemploTimers() {
  // Timer simples
  const timer = startTimer();

  // ... operação demorada
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const duration = timer();
  logger.info({ msg: 'Operação concluída', duration_ms: duration });

  // Timer com métricas
  const metricsTimer = metrics.timer('database.query.duration.ms');
  // ... query no banco
  metricsTimer(); // Registra automaticamente no histograma
}

// ============================================
// 5. OPERATION ID (Rastreamento de Operações)
// ============================================

import { v4 as uuidv4 } from 'uuid';

class DocumentService {
  private logger = createContextLogger({ service: 'DocumentService' });

  async generateDocument(data: any) {
    // ID único para esta operação específica
    const operationId = uuidv4();
    const opLogger = this.logger.child({ operationId, docType: data.type });

    const timer = startTimer();

    opLogger.info('Iniciando geração de documento');

    try {
      opLogger.debug({ msg: 'Validando dados', dataSize: JSON.stringify(data).length });

      // ... processamento

      opLogger.debug('Convertendo para PDF');
      // ... conversão

      opLogger.debug('Salvando arquivo');
      // ... salvar

      const duration = timer();
      opLogger.info({
        msg: 'Documento gerado com sucesso',
        duration_ms: duration,
        fileSize_kb: 125,
      });

      return { operationId, success: true };
    } catch (error) {
      const duration = timer();
      logError(opLogger, 'Erro ao gerar documento', error, {
        docType: data.type,
        duration_ms: duration,
      });
      throw error;
    }
  }
}

// ============================================
// 6. AUDIT LOGGER (Logs de Auditoria)
// ============================================

function exemploAuditoria(req: Request) {
  const user = (req as any).user;

  // Logs críticos para auditoria e compliance
  auditLogger.info({
    msg: 'Documento excluído',
    action: 'DELETE_DOCUMENT',
    documentId: '123',
    userId: user.id,
    userEmail: user.email,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date(),
  });

  // Ações sensíveis
  auditLogger.warn({
    msg: 'Tentativa de acesso não autorizado',
    action: 'UNAUTHORIZED_ACCESS',
    userId: user.id,
    resource: '/admin/users',
    ip: req.ip,
  });
}

// ============================================
// 7. MÉTRICAS
// ============================================

function exemploMetricas() {
  // Contadores
  metrics.increment('api.requests.total');
  metrics.increment('api.errors', 1, { statusCode: '500', endpoint: '/users' });
  metrics.decrement('active.connections');

  // Gauges (valores que sobem/descem)
  metrics.gauge('database.connections.active', 10);
  metrics.gauge('queue.size', 50);
  metrics.gauge('memory.usage.mb', process.memoryUsage().heapUsed / 1024 / 1024);

  // Histogramas (distribuições)
  metrics.histogram('response.size.bytes', 1024);
  metrics.histogram('http.request.duration.ms', 150);

  // Timer automático
  const timer = metrics.timer('operation.duration.ms', {
    operation: 'processPayment',
  });

  // ... operação

  timer(); // Registra automaticamente
}

// ============================================
// 8. ERROR TRACKING (Sentry)
// ============================================

async function exemploErrorTracking(req: Request) {
  const user = (req as any).user;

  // Definir contexto do usuário (uma vez após autenticação)
  setUserContext({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  try {
    // ... operação crítica
    throw new Error('Pagamento falhou');
  } catch (error: any) {
    // Capturar no Sentry com contexto adicional
    captureException(error, {
      extra: {
        orderId: '123',
        amount: 100.0,
        paymentMethod: 'credit_card',
      },
    });

    // Também logar localmente
    logger.error({
      msg: 'Erro no pagamento',
      error,
      orderId: '123',
    });

    throw error;
  }

  // Mensagens importantes (não erros)
  captureMessage('Limite de quota atingido: 90%', 'warning');
}

// ============================================
// 9. PADRÃO COMPLETO (Best Practice)
// ============================================

class PaymentService {
  private logger = createContextLogger({ service: 'PaymentService' });

  async processPayment(userId: string, amount: number) {
    // 1. Operation ID único
    const operationId = uuidv4();
    const opLogger = this.logger.child({ operationId, userId, amount });

    // 2. Timer de performance
    const timer = startTimer();
    const metricsTimer = metrics.timer('payment.processing.duration.ms');

    // 3. Log de início
    opLogger.info('Iniciando processamento de pagamento');

    // 4. Métricas
    metrics.increment('payments.total');
    metrics.gauge('payments.pending', 1); // Incrementar pendentes

    try {
      // 5. Logs de progresso
      opLogger.debug('Validando dados de pagamento');

      // Validação...

      opLogger.debug('Conectando com gateway de pagamento');

      // Conexão...

      opLogger.info('Pagamento aprovado pelo gateway');

      // 6. Auditoria
      auditLogger.info({
        msg: 'Pagamento processado',
        operationId,
        userId,
        amount,
        status: 'approved',
        timestamp: new Date(),
      });

      // 7. Métricas de sucesso
      metrics.increment('payments.success');
      metrics.gauge('payments.pending', -1); // Decrementar pendentes
      metrics.histogram('payment.amount', amount);

      const duration = timer();
      metricsTimer();

      // 8. Log de conclusão
      opLogger.info({
        msg: 'Pagamento processado com sucesso',
        duration_ms: duration,
        status: 'success',
      });

      return { operationId, success: true };
    } catch (error) {
      const duration = timer();
      metricsTimer();

      // 9. Métricas de erro
      metrics.increment('payments.failed');
      metrics.gauge('payments.pending', -1);

      // 10. Log estruturado de erro
      logError(opLogger, 'Erro ao processar pagamento', error, {
        userId,
        amount,
        duration_ms: duration,
      });

      // 11. Captura no Sentry
      captureException(error as Error, {
        extra: {
          operationId,
          userId,
          amount,
        },
      });

      // 12. Auditoria de falha
      auditLogger.error({
        msg: 'Falha no processamento de pagamento',
        operationId,
        userId,
        amount,
        error: (error as Error).message,
        timestamp: new Date(),
      });

      throw error;
    }
  }
}

// ============================================
// 10. LOGGING CONDICIONAL POR AMBIENTE
// ============================================

function exemploLoggingCondicional() {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  // Dados detalhados apenas em dev
  if (isDev) {
    logger.debug({
      msg: 'Dados completos da requisição',
      body: { /* ... */ },
      headers: { /* ... */ },
    });
  }

  // Sempre logar em ambos
  logger.info('Requisição processada');

  // Alertas apenas em produção
  if (isProd) {
    if (/* alguma condição crítica */) {
      captureMessage('Sistema sob alta carga', 'warning');
    }
  }
}

// ============================================
// 11. CORRELAÇÃO DE LOGS (Request ID)
// ============================================

async function exemploCorrelacao(req: Request) {
  // Request ID já está disponível
  const requestId = (req as any).id;
  const logger = (req as any).logger;

  logger.info('Processando requisição');

  // Chamar outro serviço passando o request ID
  await externalServiceCall(requestId);

  // Chamar microserviço com header
  await fetch('http://other-service/api', {
    headers: {
      'X-Request-ID': requestId,
    },
  });

  logger.info('Requisição concluída');
}

async function externalServiceCall(requestId: string) {
  // Service mantém o request ID no contexto
  const logger = createContextLogger({ requestId, service: 'ExternalService' });

  logger.info('Processando no serviço externo');
  // ...
}

// ============================================
// EXPORT DOS EXEMPLOS
// ============================================

export const examples = {
  basicLogging: exemploLoggingBasico,
  timers: exemploTimers,
  metrics: exemploMetricas,
  errorTracking: exemploErrorTracking,
  UserService,
  DocumentService,
  PaymentService,
};

/**
 * RESUMO DAS MELHORES PRÁTICAS:
 *
 * 1. ✅ Use logger estruturado: { msg: '...', data }
 * 2. ✅ Use child loggers para contexto: createContextLogger()
 * 3. ✅ Adicione operation ID para operações complexas
 * 4. ✅ Meça performance com timers
 * 5. ✅ Colete métricas importantes
 * 6. ✅ Log de auditoria para ações críticas
 * 7. ✅ Captura erros no Sentry
 * 8. ✅ Use request ID para correlação
 * 9. ✅ Logs diferentes por ambiente (dev/prod)
 * 10. ✅ NUNCA logue dados sensíveis (senhas, tokens, CPF)
 */
