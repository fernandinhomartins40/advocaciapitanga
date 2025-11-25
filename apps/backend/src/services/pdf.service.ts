import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class PDFService {
  async gerarPDF(conteudo: string, titulo: string): Promise<string> {
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
            top: 72,
            bottom: 72,
            left: 72,
            right: 72
          }
        });

        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Cabeçalho
        doc.fontSize(16)
          .font('Helvetica-Bold')
          .text('Advocacia Pitanga', { align: 'center' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(titulo, { align: 'center' })
          .moveDown(2);

        // Conteúdo
        doc.fontSize(12)
          .font('Helvetica')
          .text(conteudo, {
            align: 'justify',
            lineGap: 5
          });

        // Rodapé
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          doc.fontSize(10)
            .text(
              `Página ${i + 1} de ${pages.count}`,
              0,
              doc.page.height - 50,
              { align: 'center' }
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
