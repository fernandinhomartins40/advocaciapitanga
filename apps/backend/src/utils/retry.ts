import { logger } from './logger';

interface RetryOptions {
  maxTentativas?: number;
  delayBase?: number;
  maxDelay?: number;
  onRetry?: (tentativa: number, error: Error) => void;
}

/**
 * Executa uma função com retry automático em caso de falha
 * @param fn Função a ser executada
 * @param options Opções de retry
 * @returns Resultado da função
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxTentativas = 3,
    delayBase = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: Error;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (tentativa === maxTentativas) {
        logger.error({ msg: '[RETRY] Todas as tentativas falharam', tentativas: maxTentativas,
          error: lastError });
        throw lastError;
      }

      // Backoff exponencial com limite máximo
      const delay = Math.min(delayBase * Math.pow(2, tentativa - 1), maxDelay);

      logger.warn({
        msg: '[RETRY] Tentativa falhou, aguardando antes de retry',
        tentativa,
        maxTentativas,
        delay: `${delay}ms`,
        error: lastError.message
      });

      if (onRetry) {
        onRetry(tentativa, lastError);
      }

      await sleep(delay);
    }
  }

  // TypeScript precisa disso, mas nunca chegará aqui
  throw lastError!;
}

/**
 * Aguarda um tempo em milissegundos
 * @param ms Tempo em milissegundos
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
