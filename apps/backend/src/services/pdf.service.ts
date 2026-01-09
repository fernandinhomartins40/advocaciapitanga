import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { buildTempFilename } from '../utils/file-utils';
import { createContextLogger, logError, startTimer } from '../utils/logger';

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

/**
 * Servico de geracao de PDF usando Puppeteer/Chromium.
 * Mantem fidelidade visual do HTML e funciona em producao via Chromium.
 */
export class PDFService {
  private logger = createContextLogger({ service: 'PDFService' });

  async gerarPDF(conteudoHTML: string, titulo: string, options?: PDFOptions): Promise<string> {
    const timer = startTimer();
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = buildTempFilename(titulo, 'pdf');
    const filepath = path.join(uploadsDir, filename);

    try {
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      const pdfBuffer = await this.renderizarPDF(htmlCompleto, options);
      fs.writeFileSync(filepath, pdfBuffer);

      this.logger.info({
        msg: 'PDF gerado com sucesso',
        filepath,
        duration_ms: timer()
      });

      return filepath;
    } catch (error) {
      logError(this.logger, 'Erro ao gerar PDF', error, {
        titulo,
        duration_ms: timer()
      });
      throw error;
    }
  }

  private async renderizarPDF(html: string, options?: PDFOptions): Promise<Buffer> {
    const headerText = options?.cabecalho?.trim() || '';
    const footerText = options?.rodape?.trim() || '';
    const displayHeaderFooter = Boolean(headerText || footerText);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('screen');

      const headerTemplate = headerText
        ? `<div style="width:100%;font-size:9px;text-align:center;">${this.escapeHtml(headerText)}</div>`
        : '<span></span>';

      const footerParts = [
        footerText ? `<span>${this.escapeHtml(footerText)} - </span>` : '',
        'Pagina <span class="pageNumber"></span> de <span class="totalPages"></span>'
      ].join('');

      const footerTemplate = `<div style="width:100%;font-size:9px;text-align:center;">${footerParts}</div>`;

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter,
        headerTemplate,
        footerTemplate,
        margin: displayHeaderFooter
          ? { top: '2.5cm', bottom: '2.5cm', left: '2cm', right: '2cm' }
          : { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
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
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #111;
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
            }
            h3 {
              font-size: 14pt;
              font-weight: bold;
            }
            p {
              margin: 0.6em 0;
              text-align: justify;
            }
            ul, ol {
              margin: 0.6em 0;
              padding-left: 2em;
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
          </style>
        </head>
        <body>
          <div style="text-align: center; font-size: 10pt; margin-bottom: 20px;">
            <strong>${this.escapeHtml(cabecalho)}</strong>
          </div>

          <h1>${this.escapeHtml(titulo)}</h1>

          ${conteudo}

          ${rodape ? `
          <div style="text-align: center; font-size: 10pt; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px;">
            ${this.escapeHtml(rodape)}
          </div>
          ` : ''}

          <div style="text-align: center; font-size: 9pt; margin-top: 20px; color: #666;">
            Documento gerado em: ${new Date().toLocaleString('pt-BR')}
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
