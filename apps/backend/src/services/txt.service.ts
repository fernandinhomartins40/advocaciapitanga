import { convert } from 'html-to-text';
import { logger } from '../utils/logger';

export interface TXTOptions {
  cabecalho?: string;
  rodape?: string;
}

export class TXTService {
  async gerarTXT(conteudoHTML: string, titulo: string, options?: TXTOptions): Promise<Buffer> {
    const startTime = Date.now();

    logger.info({ msg: '[TXT] Iniciando geracao de TXT', titulo });

    try {
      const conteudoTexto = convert(conteudoHTML, {
        wordwrap: 80,
        preserveNewlines: true,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' }
        ]
      });

      let conteudoCompleto = '';

      if (options?.cabecalho) {
        conteudoCompleto += options.cabecalho + '\n';
        conteudoCompleto += '='.repeat(80) + '\n\n';
      } else {
        conteudoCompleto += 'ADVOCACIA PITANGA\n';
        conteudoCompleto += '='.repeat(80) + '\n\n';
      }

      conteudoCompleto += titulo.toUpperCase() + '\n';
      conteudoCompleto += '-'.repeat(80) + '\n\n';
      conteudoCompleto += conteudoTexto + '\n\n';

      if (options?.rodape) {
        conteudoCompleto += '='.repeat(80) + '\n';
        conteudoCompleto += options.rodape + '\n';
      }

      const dataHora = new Date().toLocaleString('pt-BR');
      conteudoCompleto += '\n' + '-'.repeat(80) + '\n';
      conteudoCompleto += `Documento gerado em: ${dataHora}\n`;

      const duration = Date.now() - startTime;
      logger.info({
        msg: '[TXT] TXT gerado com sucesso',
        duration: `${duration}ms`
      });

      return Buffer.from(conteudoCompleto, 'utf-8');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        msg: '[TXT] Erro ao gerar TXT',
        error,
        titulo,
        duration: `${duration}ms`
      });
      throw error;
    }
  }
}
