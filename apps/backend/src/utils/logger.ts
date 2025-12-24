import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Sistema de logging robusto usando Pino
 * - Performance otimizada (5x mais rápido que Winston)
 * - Logs estruturados em JSON
 * - Redação automática de dados sensíveis
 * - Suporte a child loggers com contexto
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Informações base em todos os logs
  base: {
    app: 'advocacia-backend',
    env: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    pid: process.pid,
  },

  // Pretty print apenas em desenvolvimento
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '{levelLabel} - {msg}',
      errorLikeObjectKeys: ['err', 'error'],
    }
  } : undefined,

  // Formatação para produção
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Serializers para objetos especiais
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },

  // Redact de dados sensíveis - MUITO IMPORTANTE para LGPD
  redact: {
    paths: [
      'password',
      'senha',
      'token',
      'authorization',
      'cookie',
      'cpf',
      'cnpj',
      'rg',
      'email',
      '*.password',
      '*.senha',
      '*.token',
      '*.cpf',
      '*.cnpj',
      '*.rg',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },

  // Timestamp em formato ISO
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Cria um child logger com contexto adicional
 * Útil para adicionar informações como userId, requestId, etc
 *
 * @example
 * const serviceLogger = createContextLogger({ service: 'PDFService' });
 * serviceLogger.info('Gerando PDF');
 */
export const createContextLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Cria um logger específico para uma requisição HTTP
 * Adiciona automaticamente requestId, userId, método, URL, etc
 *
 * @example
 * const reqLogger = createRequestLogger(req);
 * reqLogger.info('Processando requisição');
 */
export const createRequestLogger = (req: any) => {
  const requestId = req.headers['x-request-id'] || req.id;

  return logger.child({
    requestId,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
};

/**
 * Logger específico para operações de auditoria
 * Logs críticos que devem ser preservados e analisados
 */
export const auditLogger = logger.child({
  audit: true,
  retention: 'permanent'
});

/**
 * Logger específico para métricas de performance
 */
export const metricsLogger = logger.child({
  metrics: true
});

/**
 * Utilitário para medir tempo de execução de operações
 *
 * @example
 * const timer = startTimer();
 * await someOperation();
 * logger.info({ msg: 'Operação concluída', duration_ms: timer() });
 */
export const startTimer = () => {
  const start = Date.now();
  return () => Date.now() - start;
};

/**
 * Logger com contexto de erro estruturado
 * Garante que stack traces são capturados corretamente
 */
export const logError = (logger: pino.Logger, message: string, error: any, context?: Record<string, any>) => {
  logger.error({
    msg: message,
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error?.code,
      statusCode: error?.statusCode,
    },
    ...context,
  });
};

// Exportar tipo do logger para uso em outros arquivos
export type Logger = pino.Logger;
