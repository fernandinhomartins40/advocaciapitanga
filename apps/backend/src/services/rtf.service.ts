import { convert } from 'html-to-text';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface RTFOptions {
  cabecalho?: string;
  rodape?: string;
}

export class RTFService {
  async gerarRTF(conteudoHTML: string, titulo: string, options?: RTFOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');
    const startTime = Date.now();

    logger.info('[RTF] Iniciando geração de RTF', { titulo });

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      logger.info('[RTF] Criando diretório', { uploadsDir });
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo.replace(/\s+/g, '-')}.rtf`;
    const filepath = path.join(uploadsDir, filename);

    logger.info('[RTF] Arquivo será salvo', { filepath });

    try {
      // Converter HTML para texto limpo
      const conteudoTexto = convert(conteudoHTML, {
        wordwrap: false,
        preserveNewlines: true,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' }
        ]
      });

      // Escapar caracteres especiais para RTF
      const escapeRTF = (text: string): string => {
        return text
          .replace(/\\/g, '\\\\')
          .replace(/{/g, '\\{')
          .replace(/}/g, '\\}')
          .replace(/\n/g, '\\par\n');
      };

      // Cabeçalho RTF
      let rtfContent = '{\\rtf1\\ansi\\deff0\n';

      // Fontes
      rtfContent += '{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\froman\\fcharset0 Times New Roman;}}\n';

      // Cores
      rtfContent += '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}\n';

      // Informações do documento
      rtfContent += '{\\info{\\title ' + escapeRTF(titulo) + '}}\n';

      // Configurações de página
      rtfContent += '\\paperw11906\\paperh16838\\margl1134\\margr1134\\margt1134\\margb1134\n';

      // Cabeçalho do documento
      if (options?.cabecalho) {
        rtfContent += '{\\header\\pard\\qc\\f0\\fs18 ' + escapeRTF(options.cabecalho) + '\\par}\n';
      } else {
        rtfContent += '{\\header\\pard\\qc\\b\\f0\\fs24 Advocacia Pitanga\\b0\\par}\n';
      }

      // Rodapé do documento
      if (options?.rodape) {
        rtfContent += '{\\footer\\pard\\qc\\f0\\fs16 ' + escapeRTF(options.rodape) + '\\par';
        rtfContent += '\\qc\\fs16 P\\u225?gina {\\field{\\*\\fldinst PAGE}{\\fldrslt 1}} de {\\field{\\*\\fldinst NUMPAGES}{\\fldrslt 1}}\\par}\n';
      } else {
        rtfContent += '{\\footer\\pard\\qc\\f0\\fs16 P\\u225?gina {\\field{\\*\\fldinst PAGE}{\\fldrslt 1}} de {\\field{\\*\\fldinst NUMPAGES}{\\fldrslt 1}}\\par}\n';
      }

      // Título do documento
      rtfContent += '\\pard\\qc\\b\\f0\\fs28 ' + escapeRTF(titulo) + '\\b0\\fs24\\par\\par\n';

      // Conteúdo principal (já convertido de HTML)
      rtfContent += '\\pard\\qj\\f1\\fs24 ' + escapeRTF(conteudoTexto) + '\\par\\par\n';

      // Timestamp
      const dataHora = new Date().toLocaleString('pt-BR');
      rtfContent += '\\pard\\qc\\fs18\\i Documento gerado em: ' + escapeRTF(dataHora) + '\\i0\\par\n';

      // Fechar documento RTF
      rtfContent += '}';

      // Escrever arquivo
      logger.info('[RTF] Salvando arquivo');
      fs.writeFileSync(filepath, rtfContent, 'utf-8');

      const duration = Date.now() - startTime;
      logger.info('[RTF] RTF gerado com sucesso', { filepath, duration: `${duration}ms` });

      return filepath;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[RTF] Erro ao gerar RTF', { error, titulo, duration: `${duration}ms` });
      throw error;
    }
  }
}
