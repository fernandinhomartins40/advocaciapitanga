import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';
import { Request } from 'express';

/**
 * Inicializa o Sentry para error tracking e performance monitoring
 *
 * Configurações:
 * - Error tracking automático
 * - Performance monitoring (APM)
 * - Profiling de CPU/memória
 * - Integração com logs
 * - Captura de contexto de requisições
 *
 * Variáveis de ambiente necessárias:
 * - SENTRY_DSN: URL do projeto Sentry
 * - SENTRY_ENVIRONMENT: Nome do ambiente (production, staging, development)
 * - SENTRY_TRACES_SAMPLE_RATE: Taxa de amostragem de traces (0.0 a 1.0)
 * - SENTRY_PROFILES_SAMPLE_RATE: Taxa de amostragem de profiling (0.0 a 1.0)
 */
export const initErrorTracking = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry DSN não configurado - Error tracking desabilitado');
    logger.warn('Configure SENTRY_DSN no .env para ativar o Sentry');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

      // Identificação da aplicação
      serverName: process.env.HOSTNAME || 'advocacia-backend',
      release: process.env.APP_VERSION || '1.0.0',

      // Performance Monitoring (APM)
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),

      // Profiling de performance
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
      integrations: [
        nodeProfilingIntegration(),
      ],

      // Integração com logs
      beforeSend(event, hint) {
        // Logar também localmente quando enviar para Sentry
        logger.error({ msg: 'Erro capturado pelo Sentry', eventId: event.event_id,
          error: hint.originalException,
          level: event.level, });
        return event;
      },

      // Filtragem de erros
      ignoreErrors: [
        // Erros de rede comuns que não precisam ser rastreados
        'Network request failed',
        'NetworkError',
        'fetch failed',
        // Erros de conexão que são esperados
        'ECONNREFUSED',
        'ETIMEDOUT',
        // Cancelamentos de requisição
        'AbortError',
        'cancelled',
      ],

      // Scrubbing de dados sensíveis
      beforeBreadcrumb(breadcrumb) {
        // Remover dados sensíveis de breadcrumbs
        if (breadcrumb.category === 'http') {
          if (breadcrumb.data?.url) {
            breadcrumb.data.url = scrubSensitiveData(breadcrumb.data.url);
          }
        }
        return breadcrumb;
      },
    });

    logger.info({ msg: 'Sentry inicializado com sucesso', environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0', });
  } catch (error) {
    logger.error({ msg: 'Erro ao inicializar Sentry', error });
  }
};

/**
 * Captura uma exceção e envia para o Sentry
 * Adiciona contexto adicional ao erro
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Captura uma mensagem (não um erro) no Sentry
 * Útil para avisos ou eventos importantes
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Adiciona contexto de usuário ao Sentry
 * Chamado automaticamente pelo middleware de auth
 */
export const setUserContext = (user: { id: string; email?: string; role?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
};

/**
 * Adiciona contexto de requisição HTTP ao Sentry
 * Usado pelo error middleware
 */
export const captureRequestError = (error: Error, req: Request) => {
  Sentry.withScope((scope) => {
    // Adicionar dados da requisição
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: scrubSensitiveHeaders(req.headers),
      query: req.query,
      requestId: (req as any).id,
    });

    // Adicionar dados do usuário se existir
    if ((req as any).user) {
      scope.setUser({
        id: (req as any).user.id,
        email: (req as any).user.email,
        role: (req as any).user.role,
      });
    }

    // Tags para facilitar busca
    scope.setTag('endpoint', `${req.method} ${req.path}`);
    scope.setTag('status_code', (error as any).statusCode || 500);

    Sentry.captureException(error);
  });
};

/**
 * Remove dados sensíveis de URLs
 */
function scrubSensitiveData(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remover tokens de query string
    if (urlObj.searchParams.has('token')) {
      urlObj.searchParams.set('token', '[REDACTED]');
    }
    if (urlObj.searchParams.has('senha')) {
      urlObj.searchParams.set('senha', '[REDACTED]');
    }
    if (urlObj.searchParams.has('password')) {
      urlObj.searchParams.set('password', '[REDACTED]');
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Remove headers sensíveis
 */
function scrubSensitiveHeaders(headers: any): any {
  const scrubbed = { ...headers };

  if (scrubbed.authorization) {
    scrubbed.authorization = '[REDACTED]';
  }
  if (scrubbed.cookie) {
    scrubbed.cookie = '[REDACTED]';
  }
  if (scrubbed['x-api-key']) {
    scrubbed['x-api-key'] = '[REDACTED]';
  }

  return scrubbed;
}

/**
 * Flush do Sentry - aguarda envio de eventos pendentes
 * Útil antes de shutdown do servidor
 */
export const flushErrorTracking = async (timeout = 2000): Promise<boolean> => {
  try {
    await Sentry.flush(timeout);
    logger.info('Sentry flush concluído');
    return true;
  } catch (error) {
    logger.error({ msg: 'Erro ao fazer flush do Sentry', error });
    return false;
  }
};
