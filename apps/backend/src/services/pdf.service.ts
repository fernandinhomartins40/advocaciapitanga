import puppeteer, { Browser } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { puppeteerPool } from '../utils/puppeteer-pool';
import { buildTempFilename } from '../utils/file-utils';

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

export class PDFService {
  async gerarPDF(conteudoHTML: string, titulo: string, options?: PDFOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');
    const startTime = Date.now();
    let browser: Browser | null = null;
    let usandoPool = false;

    logger.info({ msg: '[PDF] Iniciando geração de PDF', titulo, uploadsDir });

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      logger.info({ msg: '[PDF] Criando diretório', uploadsDir });
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = buildTempFilename(titulo, 'pdf');
    const filepath = path.join(uploadsDir, filename);

    logger.info({ msg: '[PDF] Arquivo será salvo', filepath });

    try {
      // Montar HTML completo com estilos
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      logger.debug({ msg: '[PDF] HTML montado', size: htmlCompleto.length });

      // Tentar usar pool de browsers (fallback para criação manual se pool não disponível)
      try {
        browser = await puppeteerPool.acquire();
        usandoPool = true;
        logger.debug('[PDF] Browser adquirido do pool');
      } catch (poolError) {
        logger.warn({ msg: '[PDF] Pool não disponível, usando browser standalone', error: poolError });
        // Fallback será tratado pelo código original se necessário
      }

      if (!browser) {
        logger.info('[PDF] Iniciando browser standalone');
        browser = await this.launchStandaloneBrowser();
      }

      logger.info('[PDF] Criando nova página');
      const page = await browser.newPage();

      // Carregar HTML com timeout
      logger.info('[PDF] Carregando HTML na página');
      await page.setContent(htmlCompleto, {
        waitUntil: 'networkidle0',
        timeout: 30000 // Timeout de 30s para carregar conteúdo
      });

      // Gerar PDF
      logger.info('[PDF] Gerando PDF');
      await page.pdf({
        path: filepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        displayHeaderFooter: true,
        headerTemplate: this.montarCabecalho(options),
        footerTemplate: this.montarRodape(options),
        timeout: 30000 // Timeout de 30s para gerar PDF
      });

      // Fechar página para liberar memória
      await page.close();

      const duration = Date.now() - startTime;
      logger.info({
        msg: '[PDF] PDF gerado com sucesso',
        filepath,
        duration: `${duration}ms`,
        usandoPool
      });

      return filepath;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        msg: '[PDF] Erro ao gerar PDF',
        error,
        titulo,
        duration: `${duration}ms`
      });
      throw error;
    } finally {
      // Liberar browser de volta ao pool (ou fechar se não veio do pool)
      if (browser) {
        if (usandoPool) {
          try {
            await puppeteerPool.release(browser);
            logger.debug('[PDF] Browser devolvido ao pool');
          } catch (releaseError) {
            logger.error({ msg: '[PDF] Erro ao devolver browser ao pool', error: releaseError });
          }
        } else {
          try {
            await browser.close();
            logger.debug('[PDF] Browser standalone fechado');
          } catch (closeError) {
            logger.error({ msg: '[PDF] Erro ao fechar browser standalone', error: closeError });
          }
        }
      }
    }
  }

  private montarHTMLCompleto(conteudo: string, titulo: string, options?: PDFOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 2cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
              margin: 0;
              padding: 20px 0;
            }
            h1, h2, h3, h4, h5, h6 {
              font-family: Arial, sans-serif;
              margin-top: 1.5em;
              margin-bottom: 0.75em;
              font-weight: bold;
            }
            h1 {
              font-size: 18pt;
              text-align: center;
              margin-bottom: 1.5em;
            }
            h2 { font-size: 16pt; }
            h3 { font-size: 14pt; }
            p {
              margin: 0.5em 0;
              text-align: justify;
            }
            ul, ol {
              margin: 0.5em 0;
              padding-left: 2em;
            }
            li {
              margin: 0.25em 0;
            }
            strong, b {
              font-weight: bold;
            }
            em, i {
              font-style: italic;
            }
            u {
              text-decoration: underline;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
            }
            table, th, td {
              border: 1px solid #000;
            }
            th, td {
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .titulo-principal {
              text-align: center;
              font-size: 18pt;
              font-weight: bold;
              margin-bottom: 2em;
              margin-top: 1em;
            }
          </style>
        </head>
        <body>
          <div class="titulo-principal">${titulo}</div>
          ${conteudo}
        </body>
      </html>
    `;
  }

  private montarCabecalho(options?: PDFOptions): string {
    const cabecalhoTexto = options?.cabecalho || 'Advocacia Pitanga';
    return `
      <div style="width: 100%; font-size: 9pt; text-align: center; padding: 10px 0; border-bottom: 1px solid #ccc;">
        ${cabecalhoTexto}
      </div>
    `;
  }

  private montarRodape(options?: PDFOptions): string {
    const rodapeTexto = options?.rodape || '';
    return `
      <div style="width: 100%; font-size: 9pt; text-align: center; padding: 10px 40px;">
        ${rodapeTexto ? `<div style="margin-bottom: 5px;">${rodapeTexto}</div>` : ''}
        <div>
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      </div>
    `;
  }

  private getExecutablePath(): string {
    const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (configuredPath) {
      return configuredPath;
    }

    const bundledPath = path.join(__dirname, '../../chrome/win64-145.0.7569.0/chrome-win64/chrome.exe');
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }

    return puppeteer.executablePath();
  }

  private async launchStandaloneBrowser(): Promise<Browser> {
    const executablePath = this.getExecutablePath();
    return puppeteer.launch({
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
        '--disable-webgl2'
      ],
      timeout: 30000,
    });
  }
}

