import fs from 'fs';
import path from 'path';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { buildTempFilename } from '../utils/file-utils';

// Configurar fontes
(pdfMake as any).vfs = pdfFonts;

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

/**
 * Serviço de geração de PDF usando PDFMake
 * Não depende de browsers headless, funciona em qualquer ambiente
 */
export class PDFService {
  async gerarPDF(conteudoHTML: string, titulo: string, options?: PDFOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = buildTempFilename(titulo, 'pdf');
    const filepath = path.join(uploadsDir, filename);

    try {
      // Converter HTML para estrutura do PDFMake
      const content = this.htmlToContent(conteudoHTML);

      // Definir documento
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [56.7, 56.7, 56.7, 56.7], // 2cm em pontos
        header: options?.cabecalho ? {
          text: options.cabecalho,
          alignment: 'center',
          margin: [0, 20, 0, 0],
          fontSize: 9
        } : undefined,
        footer: (currentPage: number, pageCount: number) => {
          const footerContent: any[] = [];

          if (options?.rodape) {
            footerContent.push({
              text: options.rodape,
              alignment: 'center',
              fontSize: 9,
              margin: [0, 0, 0, 5]
            });
          }

          footerContent.push({
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 9
          });

          return footerContent;
        },
        content: [
          {
            text: titulo,
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          ...content
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true
          },
          subheader: {
            fontSize: 16,
            bold: true,
            margin: [0, 15, 0, 10]
          },
          subsubheader: {
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 8]
          },
          paragraph: {
            fontSize: 12,
            alignment: 'justify',
            lineHeight: 1.5,
            margin: [0, 5, 0, 5]
          },
          bold: {
            bold: true
          },
          italic: {
            italics: true
          }
        },
        defaultStyle: {
          fontSize: 12
        }
      };

      // Gerar PDF usando createPdf
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);

      // Gerar buffer e salvar em arquivo
      return new Promise<string>((resolve, reject) => {
        try {
          pdfDocGenerator.getBase64((base64Data: string) => {
            try {
              const buffer = Buffer.from(base64Data, 'base64');
              fs.writeFileSync(filepath, buffer);
              resolve(filepath);
            } catch (error) {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao gerar PDF';
      throw new Error(`Falha ao gerar PDF: ${errorMessage}`);
    }
  }

  /**
   * Converte HTML básico para estrutura de conteúdo do PDFMake
   */
  private htmlToContent(html: string): any[] {
    const content: any[] = [];

    // Remover tags HTML e processar o texto
    const cleanHtml = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '');

    // Processar títulos
    const lines = cleanHtml.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // H1
      if (line.match(/<h1[^>]*>/i)) {
        const text = line.replace(/<\/?h1[^>]*>/gi, '').trim();
        if (text) {
          content.push({
            text,
            style: 'header',
            margin: [0, 15, 0, 10]
          });
        }
        continue;
      }

      // H2
      if (line.match(/<h2[^>]*>/i)) {
        const text = line.replace(/<\/?h2[^>]*>/gi, '').trim();
        if (text) {
          content.push({
            text,
            style: 'subheader'
          });
        }
        continue;
      }

      // H3
      if (line.match(/<h3[^>]*>/i)) {
        const text = line.replace(/<\/?h3[^>]*>/gi, '').trim();
        if (text) {
          content.push({
            text,
            style: 'subsubheader'
          });
        }
        continue;
      }

      // Processar texto com formatação básica (bold, italic)
      const processedText = this.processInlineFormatting(line);

      if (processedText) {
        content.push({
          text: processedText,
          style: 'paragraph'
        });
      }
    }

    return content.length > 0 ? content : [{ text: html, style: 'paragraph' }];
  }

  /**
   * Processa formatação inline (bold, italic)
   */
  private processInlineFormatting(text: string): any {
    // Remove todas as tags HTML exceto strong, b, em, i
    const cleaned = text
      .replace(/<(?!\/?(strong|b|em|i)\b)[^>]+>/gi, '')
      .trim();

    if (!cleaned) return null;

    // Se não tem tags de formatação, retorna texto simples
    if (!cleaned.match(/<(strong|b|em|i)>/i)) {
      return cleaned;
    }

    // Processar formatação
    const result: any[] = [];
    const parts = cleaned.split(/(<\/?(?:strong|b|em|i)>)/gi);

    let currentBold = false;
    let currentItalic = false;

    for (const part of parts) {
      if (part.match(/<(strong|b)>/i)) {
        currentBold = true;
      } else if (part.match(/<\/(strong|b)>/i)) {
        currentBold = false;
      } else if (part.match(/<(em|i)>/i)) {
        currentItalic = true;
      } else if (part.match(/<\/(em|i)>/i)) {
        currentItalic = false;
      } else if (part.trim()) {
        const style: any = { text: part };
        if (currentBold) style.bold = true;
        if (currentItalic) style.italics = true;
        result.push(style);
      }
    }

    return result.length > 0 ? result : cleaned;
  }
}
