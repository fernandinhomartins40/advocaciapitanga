import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

export class PDFService {
  async gerarPDF(conteudoHTML: string, titulo: string, options?: PDFOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

    console.log('[PDF] Iniciando geração de PDF:', { titulo, uploadsDir });

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      console.log('[PDF] Criando diretório:', uploadsDir);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo.replace(/\s+/g, '-')}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    console.log('[PDF] Arquivo será salvo em:', filepath);

    let browser;
    try {
      // Montar HTML completo com estilos
      const htmlCompleto = this.montarHTMLCompleto(conteudoHTML, titulo, options);
      console.log('[PDF] HTML montado, tamanho:', htmlCompleto.length, 'caracteres');

      // Iniciar puppeteer
      console.log('[PDF] Iniciando Puppeteer...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      console.log('[PDF] Puppeteer iniciado, criando nova página...');
      const page = await browser.newPage();

      // Carregar HTML
      console.log('[PDF] Carregando HTML na página...');
      await page.setContent(htmlCompleto, { waitUntil: 'networkidle0' });

      // Gerar PDF
      console.log('[PDF] Gerando PDF...');
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
        footerTemplate: this.montarRodape(options)
      });

      console.log('[PDF] PDF gerado com sucesso');
      await browser.close();
      console.log('[PDF] Browser fechado');
      return filepath;
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);
      if (browser) {
        await browser.close();
      }
      throw error;
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
}
