import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import fs from 'fs';
import path from 'path';

export class DOCXService {
  async gerarDOCX(conteudo: string, titulo: string): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo}.docx`;
    const filepath = path.join(uploadsDir, filename);

    // Dividir o conteúdo em parágrafos
    const paragrafos = conteudo.split('\n').filter(line => line.trim() !== '');

    // Criar documento com formatação adequada
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Título principal
            new Paragraph({
              text: titulo,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),
            // Conteúdo
            ...paragrafos.map((paragrafo) => {
              // Detectar se é um título ou subtítulo
              const isHeading = paragrafo.match(/^#+\s/) || paragrafo.match(/^[A-Z][^a-z]*$/);

              if (isHeading) {
                return new Paragraph({
                  text: paragrafo.replace(/^#+\s/, ''),
                  heading: HeadingLevel.HEADING_2,
                  spacing: {
                    before: 200,
                    after: 200,
                  },
                });
              }

              // Detectar listas
              const isList = paragrafo.match(/^[\d\-\*]\.\s/) || paragrafo.match(/^[\-\*]\s/);

              return new Paragraph({
                children: [
                  new TextRun({
                    text: paragrafo,
                    font: 'Arial',
                    size: 24, // 12pt
                  }),
                ],
                spacing: {
                  before: 100,
                  after: 100,
                  line: 360, // 1.5 line spacing
                },
                alignment: AlignmentType.JUSTIFIED,
                indent: isList ? { left: 720 } : undefined, // Indent para listas
              });
            }),
          ],
        },
      ],
    });

    // Gerar o buffer e salvar
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filepath, buffer);

    return filepath;
  }
}
