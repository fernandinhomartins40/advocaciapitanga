import { spawn } from 'child_process';
import { createContextLogger, logError, startTimer } from '../utils/logger';

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

/**
 * Servico de geracao de PDF usando wkhtmltopdf.
 * Funciona de forma confiavel em ambientes Docker com xvfb-run.
 */
export class PDFService {
  private logger = createContextLogger({ service: 'PDFService' });

  async gerarPDF(conteudoHTML: string, titulo: string, options?: PDFOptions): Promise<Buffer> {
    const timer = startTimer();

    try {
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      const pdfBuffer = await this.renderizarPDF(htmlCompleto, options);

      this.logger.info({
        msg: 'PDF gerado com sucesso',
        duration_ms: timer()
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

  private async renderizarPDF(html: string, options?: PDFOptions): Promise<Buffer> {
    const headerText = (options?.cabecalho ?? 'Advocacia Pitanga').trim();
    const footerText = options?.rodape?.trim() || '';
    const binPath = process.env.WKHTMLTOPDF_PATH || 'wkhtmltopdf';
    const useXvfb = process.env.WKHTMLTOPDF_USE_XVFB !== 'false';

    const args = [
      '--encoding', 'utf-8',
      '--page-size', 'A4',
      '--margin-top', '25mm',
      '--margin-bottom', '25mm',
      '--margin-left', '20mm',
      '--margin-right', '20mm',
      '--quiet',
    ];

    if (headerText) {
      args.push('--header-center', headerText);
    }

    if (footerText) {
      args.push('--footer-center', `${footerText} - Página [page] de [topage]`);
    } else {
      args.push('--footer-center', 'Página [page] de [topage]');
    }

    args.push('-', '-');

    return new Promise<Buffer>((resolve, reject) => {
      const command = useXvfb ? 'xvfb-run' : binPath;
      const commandArgs = useXvfb ? ['-a', binPath, ...args] : args;
      const child = spawn(command, commandArgs);
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        const output = Buffer.concat(stdoutChunks);
        const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim();

        if (code === 0 && output.length > 0) {
          resolve(output);
          return;
        }

        if (code === 0 && output.length === 0) {
          reject(new Error(stderr || 'wkhtmltopdf gerou PDF vazio'));
          return;
        }

        reject(new Error(stderr || `wkhtmltopdf falhou com codigo ${code}`));
      });

      child.stdin.write(html);
      child.stdin.end();
    });
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
