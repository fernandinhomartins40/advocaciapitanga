import HTMLtoDOCX from '@turbodocx/html-to-docx';
import { createContextLogger, startTimer, logError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface DOCXOptions {
  cabecalho?: string;
  rodape?: string;
}

export class DOCXService {
  private logger = createContextLogger({ service: 'DOCXService' });

  async gerarDOCX(conteudoHTML: string, titulo: string, options?: DOCXOptions): Promise<Buffer> {
    const operationId = uuidv4();
    const opLogger = this.logger.child({ operationId, titulo });
    const timer = startTimer();

    opLogger.info({
      msg: 'Iniciando geracao de DOCX',
      htmlSize: conteudoHTML.length,
      hasOptions: !!options,
    });

    try {
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      opLogger.debug({ msg: 'HTML montado', htmlSize: htmlCompleto.length });

      const docxBuffer = await HTMLtoDOCX(htmlCompleto, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: 'Times New Roman',
        fontSize: 24,
        orientation: 'portrait',
        margins: {
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
      });

      const duration = timer();
      opLogger.info({
        msg: 'DOCX gerado com sucesso',
        duration_ms: duration,
      });

      return Buffer.from(docxBuffer as ArrayBuffer);
    } catch (error) {
      const duration = timer();
      logError(opLogger, 'Erro ao gerar DOCX', error, {
        titulo,
        htmlSize: conteudoHTML.length,
        duration_ms: duration,
      });
      throw error;
    }
  }

  private montarHTMLCompleto(conteudo: string, titulo: string, options?: DOCXOptions): string {
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
              line-height: 1.5;
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
              margin: 0.5em 0;
              text-align: justify;
            }
            ul, ol {
              margin: 0.5em 0;
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
            <strong>${cabecalho}</strong>
          </div>

          <h1>${titulo}</h1>

          ${conteudo}

          ${rodape ? `
          <div style="text-align: center; font-size: 10pt; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px;">
            ${rodape}
          </div>
          ` : ''}

          <div style="text-align: center; font-size: 9pt; margin-top: 20px; color: #666;">
            Documento gerado em: ${new Date().toLocaleString('pt-BR')}
          </div>
        </body>
      </html>
    `;
  }
}
