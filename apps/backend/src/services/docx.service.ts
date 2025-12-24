import HTMLtoDOCX from '@turbodocx/html-to-docx';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface DOCXOptions {
  cabecalho?: string;
  rodape?: string;
}

export class DOCXService {
  async gerarDOCX(conteudoHTML: string, titulo: string, options?: DOCXOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');
    const startTime = Date.now();

    logger.info('[DOCX] Iniciando geração de DOCX', { titulo, uploadsDir });

    if (!fs.existsSync(uploadsDir)) {
      logger.info('[DOCX] Criando diretório', { uploadsDir });
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo.replace(/\s+/g, '-')}.docx`;
    const filepath = path.join(uploadsDir, filename);

    logger.info('[DOCX] Arquivo será salvo', { filepath });

    try {
      // Montar HTML completo com cabeçalho e rodapé
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      logger.debug('[DOCX] HTML montado', { size: htmlCompleto.length });

      // Converter HTML para DOCX com @turbodocx/html-to-docx
      logger.info('[DOCX] Convertendo HTML para DOCX');
      const docxBuffer = await HTMLtoDOCX(htmlCompleto, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: 'Times New Roman',
        fontSize: 24, // 12pt (fontSize é em half-points, então 24 = 12pt)
        orientation: 'portrait',
        margins: {
          top: 1440, // 2.54cm in twips (1440 twips = 1 inch = 2.54cm)
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
      });

      logger.info('[DOCX] Salvando arquivo');
      // @turbodocx retorna Buffer, que é compatível com writeFileSync
      fs.writeFileSync(filepath, Buffer.from(docxBuffer as ArrayBuffer));

      const duration = Date.now() - startTime;
      logger.info('[DOCX] DOCX gerado com sucesso', { filepath, duration: `${duration}ms` });

      return filepath;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[DOCX] Erro ao gerar DOCX', { error, titulo, duration: `${duration}ms` });
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
