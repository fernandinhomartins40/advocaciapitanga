import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface PDFOptions {
  cabecalho?: string;
  rodape?: string;
}

export class PDFService {
  async gerarPDF(conteudo: string, titulo: string, options?: PDFOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo.replace(/\s+/g, '-')}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: options?.cabecalho ? 100 : 72,
            bottom: options?.rodape ? 100 : 72,
            left: 72,
            right: 72
          }
        });

        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Cabeçalho personalizado ou padrão
        if (options?.cabecalho) {
          doc.fontSize(10)
            .font('Helvetica')
            .text(options.cabecalho, 72, 40, {
              align: 'center',
              width: doc.page.width - 144
            })
            .moveDown(0.5);
        } else {
          doc.fontSize(16)
            .font('Helvetica-Bold')
            .text('Advocacia Pitanga', { align: 'center' })
            .moveDown(0.5);
        }

        doc.fontSize(14)
          .font('Helvetica-Bold')
          .text(titulo, { align: 'center' })
          .moveDown(2);

        // Conteúdo
        doc.fontSize(12)
          .font('Helvetica')
          .text(conteudo, {
            align: 'justify',
            lineGap: 5
          });

        // Rodapé personalizado ou padrão
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          if (options?.rodape) {
            doc.fontSize(9)
              .font('Helvetica')
              .text(
                options.rodape,
                72,
                doc.page.height - 80,
                {
                  align: 'center',
                  width: doc.page.width - 144
                }
              );
          }

          // Número da página sempre no final
          doc.fontSize(9)
            .text(
              `Página ${i + 1} de ${pages.count}`,
              72,
              doc.page.height - 50,
              {
                align: 'center',
                width: doc.page.width - 144
              }
            );
        }

        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });

        stream.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
