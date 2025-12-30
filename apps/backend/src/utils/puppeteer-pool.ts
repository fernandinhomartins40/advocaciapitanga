import puppeteer, { Browser } from 'puppeteer';
import genericPool, { Pool } from 'generic-pool';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Pool de browsers Puppeteer para reutilização e melhor performance
 */
class PuppeteerPool {
  private pool: Pool<Browser> | null = null;
  private isInitialized = false;

  /**
   * Inicializa o pool de browsers
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[PUPPETEER_POOL] Pool já está inicializado');
      return;
    }

    try {
      const factory = {
        create: async (): Promise<Browser> => {
          logger.info('[PUPPETEER_POOL] Criando novo browser');

          // Configurar caminho do Chrome com fallback
          const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
            (fs.existsSync(path.join(__dirname, '../../chrome/win64-145.0.7569.0/chrome-win64/chrome.exe'))
              ? path.join(__dirname, '../../chrome/win64-145.0.7569.0/chrome-win64/chrome.exe')
              : puppeteer.executablePath());

          const browser = await puppeteer.launch({
            headless: true,
            executablePath,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-software-rasterizer',
              '--disable-gl-drawing-for-tests',
              '--disable-features=VizDisplayCompositor',
              '--no-zygote',
              '--single-process',
              '--disable-features=HttpsFirstBalancedModeAutoEnable',
              '--use-gl=swiftshader',
              '--disable-vulkan',
              '--disable-accelerated-2d-canvas',
              '--disable-webgl',
              '--disable-webgl2',
              '--disable-crash-reporter',
              '--crash-dumps-dir=/tmp'
            ],
            timeout: 30000,
          });

          logger.info('[PUPPETEER_POOL] Browser criado com sucesso');
          return browser;
        },

        destroy: async (browser: Browser): Promise<void> => {
          logger.info('[PUPPETEER_POOL] Fechando browser');
          try {
            await browser.close();
            logger.info('[PUPPETEER_POOL] Browser fechado com sucesso');
          } catch (error) {
            logger.error({ msg: '[PUPPETEER_POOL] Erro ao fechar browser', error });
          }
        },

        validate: async (browser: Browser): Promise<boolean> => {
          try {
            // Verificar se o browser ainda está conectado
            const version = await browser.version();
            return !!version;
          } catch {
            return false;
          }
        }
      };

      this.pool = genericPool.createPool(factory, {
        max: 3, // Máximo de 3 browsers simultâneos
        min: 0, // Não manter browsers ociosos (economiza memória)
        testOnBorrow: true, // Validar browser antes de usar
        acquireTimeoutMillis: 60000, // Timeout de 60s para adquirir browser
        evictionRunIntervalMillis: 30000, // Verificar browsers inativos a cada 30s
        idleTimeoutMillis: 120000, // Fechar browsers ociosos após 2 min
      });

      this.isInitialized = true;
      logger.info({ msg: '[PUPPETEER_POOL] Pool inicializado', max: 3,
        min: 0 });
    } catch (error) {
      logger.error({ msg: '[PUPPETEER_POOL] Erro ao inicializar pool', error });
      throw error;
    }
  }

  /**
   * Adquire um browser do pool
   */
  async acquire(): Promise<Browser> {
    if (!this.pool) {
      throw new Error('Pool não inicializado. Chame initialize() primeiro.');
    }

    try {
      logger.debug('[PUPPETEER_POOL] Adquirindo browser do pool');
      const browser = await this.pool.acquire();
      logger.debug({ msg: '[PUPPETEER_POOL] Browser adquirido', available: this.pool.available,
        pending: this.pool.pending,
        size: this.pool.size });
      return browser;
    } catch (error) {
      logger.error({ msg: '[PUPPETEER_POOL] Erro ao adquirir browser', error });
      throw error;
    }
  }

  /**
   * Libera um browser de volta ao pool
   */
  async release(browser: Browser): Promise<void> {
    if (!this.pool) {
      logger.warn('[PUPPETEER_POOL] Pool não inicializado, fechando browser manualmente');
      await browser.close();
      return;
    }

    try {
      logger.debug('[PUPPETEER_POOL] Liberando browser de volta ao pool');
      await this.pool.release(browser);
      logger.debug({ msg: '[PUPPETEER_POOL] Browser liberado', available: this.pool.available,
        pending: this.pool.pending,
        size: this.pool.size });
    } catch (error) {
      logger.error({ msg: '[PUPPETEER_POOL] Erro ao liberar browser', error });
      // Em caso de erro, tentar fechar manualmente
      try {
        await browser.close();
      } catch (closeError) {
        logger.error({ msg: '[PUPPETEER_POOL] Erro ao fechar browser manualmente', error: closeError });
      }
    }
  }

  /**
   * Retorna estatísticas do pool
   */
  getStats() {
    if (!this.pool) {
      return {
        size: 0,
        available: 0,
        pending: 0,
        initialized: false
      };
    }

    return {
      size: this.pool.size,
      available: this.pool.available,
      pending: this.pool.pending,
      initialized: this.isInitialized
    };
  }

  /**
   * Limpa todos os browsers do pool
   */
  async drain(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      logger.info('[PUPPETEER_POOL] Drenando pool de browsers');
      await this.pool.drain();
      await this.pool.clear();
      this.isInitialized = false;
      logger.info('[PUPPETEER_POOL] Pool drenado com sucesso');
    } catch (error) {
      logger.error({ msg: '[PUPPETEER_POOL] Erro ao drenar pool', error });
    }
  }
}

// Exportar singleton
export const puppeteerPool = new PuppeteerPool();
