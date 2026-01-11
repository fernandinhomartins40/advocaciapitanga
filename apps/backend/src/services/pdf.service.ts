import { chromium } from 'playwright';
import { createContextLogger, logError, startTimer } from '../utils/logger';

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

/**
 * Servico de geracao de PDF usando Playwright.
 * Renderiza HTML moderno do TipTap de forma confiavel em Docker/VPS.
 *
 * Playwright foi escolhido por:
 * - ✅ Funciona perfeitamente em ambientes headless (Docker/VPS)
 * - ✅ Renderiza HTML moderno do TipTap sem problemas
 * - ✅ Chromium bundled (não precisa instalar separado)
 * - ✅ Melhor isolamento de processos que Puppeteer
 * - ✅ Mantido pela Microsoft (mais estável)
 * - ✅ API mais limpa e confiável
 */
export class PDFService {
  private logger = createContextLogger({ service: 'PDFService' });

  async gerarPDF(conteudoHTML: string, titulo: string, options?: PDFOptions): Promise<Buffer> {
    const timer = startTimer();

    try {
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      const pdfBuffer = await this.renderizarPDF(htmlCompleto);

      this.logger.info({
        msg: 'PDF gerado com sucesso',
        duration_ms: timer(),
        tamanho_bytes: pdfBuffer.length
      });

      return pdfBuffer;
    } catch (error) {
      logError(this.logger, 'Erro ao gerar PDF', error, {
        titulo,
        duration_ms: timer()
      });
      throw error;
    }
  }

  private async renderizarPDF(html: string): Promise<Buffer> {
    this.logger.debug({
      msg: 'Iniciando renderização com Playwright',
      htmlSize: html.length
    });

    let browser;
    try {
      // Configuração otimizada para Docker/VPS
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--disable-ipc-flooding-protection',
          '--disable-renderer-backgrounding',
          '--enable-features=NetworkService,NetworkServiceInProcess',
          '--force-color-profile=srgb',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
        ],
        // Timeout de 30 segundos para iniciar o browser
        timeout: 30000
      });

      this.logger.debug({ msg: 'Browser Playwright iniciado' });

      const page = await browser.newPage();

      // Carregar HTML com timeout
      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      this.logger.debug({ msg: 'HTML carregado na página' });

      // Gerar PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '20mm',
          bottom: '15mm',
          left: '20mm'
        }
      });

      this.logger.debug({
        msg: 'PDF gerado',
        tamanho: pdfBuffer.length
      });

      return pdfBuffer;
    } catch (error: any) {
      this.logger.error({
        msg: 'Erro ao renderizar PDF com Playwright',
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        this.logger.debug({ msg: 'Browser Playwright fechado' });
      }
    }
  }

  private montarHTMLCompleto(conteudo: string, titulo: string, options?: PDFOptions): string {
    const cabecalho = options?.cabecalho || 'Advocacia Pitanga';
    const rodape = options?.rodape || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #111;
              margin: 0;
              padding: 0;
            }

            h1 {
              font-size: 18pt;
              text-align: center;
              margin-bottom: 1.5em;
              font-weight: bold;
            }

            h2 {
              font-size: 16pt;
              font-weight: bold;
              margin-top: 1.2em;
              margin-bottom: 0.6em;
            }

            h3 {
              font-size: 14pt;
              font-weight: bold;
              margin-top: 1em;
              margin-bottom: 0.5em;
            }

            p {
              margin: 0.6em 0;
              text-align: justify;
            }

            ul, ol {
              margin: 0.6em 0;
              padding-left: 2em;
            }

            li {
              margin: 0.3em 0;
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

            strong, b {
              font-weight: bold;
            }

            em, i {
              font-style: italic;
            }

            u {
              text-decoration: underline;
            }

            /* Suporte para TipTap/ProseMirror */
            .ProseMirror {
              outline: none;
            }

            .ProseMirror p.is-editor-empty:first-child::before {
              content: none;
            }

            /* Remover atributos de edição */
            [contenteditable] {
              -webkit-user-modify: read-only !important;
            }

            /* Melhorar quebras de página */
            @media print {
              h1, h2, h3 {
                page-break-after: avoid;
              }

              table, figure {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; font-size: 10pt; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
            <strong>${this.escapeHtml(cabecalho)}</strong>
          </div>

          <h1>${this.escapeHtml(titulo)}</h1>

          <div class="conteudo-documento">
            ${conteudo}
          </div>

          ${rodape ? `
          <div style="text-align: center; font-size: 10pt; margin-top: 40px; padding-top: 10px; border-top: 1px solid #ccc;">
            ${this.escapeHtml(rodape)}
          </div>
          ` : ''}

          <div style="text-align: center; font-size: 9pt; margin-top: 20px; color: #666;">
            Documento gerado em: ${new Date().toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
