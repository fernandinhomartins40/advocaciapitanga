import { convert } from 'html-to-text';
import { logger } from '../utils/logger';

export interface RTFOptions {
  cabecalho?: string;
  rodape?: string;
}

export class RTFService {
  async gerarRTF(conteudoHTML: string, titulo: string, options?: RTFOptions): Promise<Buffer> {
    const startTime = Date.now();

    logger.info({ msg: '[RTF] Iniciando geracao de RTF', titulo });

    try {
      const conteudoTexto = convert(conteudoHTML, {
        wordwrap: false,
        preserveNewlines: true,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' }
        ]
      });

      const escapeRTF = (text: string): string => {
        return text
          .replace(/\\/g, '\\\\')
          .replace(/{/g, '\\{')
          .replace(/}/g, '\\}')
          .replace(/\n/g, '\\par\n');
      };

      let rtfContent = '{\\rtf1\\ansi\\deff0\n';
      rtfContent += '{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\froman\\fcharset0 Times New Roman;}}\n';
      rtfContent += '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}\n';
      rtfContent += '{\\info{\\title ' + escapeRTF(titulo) + '}}\n';
      rtfContent += '\\paperw11906\\paperh16838\\margl1134\\margr1134\\margt1134\\margb1134\n';

      if (options?.cabecalho) {
        rtfContent += '{\\header\\pard\\qc\\f0\\fs18 ' + escapeRTF(options.cabecalho) + '\\par}\n';
      } else {
        rtfContent += '{\\header\\pard\\qc\\b\\f0\\fs24 Advocacia Pitanga\\b0\\par}\n';
      }

      if (options?.rodape) {
        rtfContent += '{\\footer\\pard\\qc\\f0\\fs16 ' + escapeRTF(options.rodape) + '\\par';
        rtfContent += '\\qc\\fs16 Pagina {\\field{\\*\\fldinst PAGE}{\\fldrslt 1}} de {\\field{\\*\\fldinst NUMPAGES}{\\fldrslt 1}}\\par}\n';
      } else {
        rtfContent += '{\\footer\\pard\\qc\\f0\\fs16 Pagina {\\field{\\*\\fldinst PAGE}{\\fldrslt 1}} de {\\field{\\*\\fldinst NUMPAGES}{\\fldrslt 1}}\\par}\n';
      }

      rtfContent += '\\pard\\qc\\b\\f0\\fs28 ' + escapeRTF(titulo) + '\\b0\\fs24\\par\\par\n';
      rtfContent += '\\pard\\qj\\f1\\fs24 ' + escapeRTF(conteudoTexto) + '\\par\\par\n';

      const dataHora = new Date().toLocaleString('pt-BR');
      rtfContent += '\\pard\\qc\\fs18\\i Documento gerado em: ' + escapeRTF(dataHora) + '\\i0\\par\n';
      rtfContent += '}';

      const duration = Date.now() - startTime;
      logger.info({
        msg: '[RTF] RTF gerado com sucesso',
        duration: `${duration}ms`
      });

      return Buffer.from(rtfContent, 'utf-8');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        msg: '[RTF] Erro ao gerar RTF',
        error,
        titulo,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}
