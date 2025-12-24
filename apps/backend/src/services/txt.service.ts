import { convert } from 'html-to-text';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface TXTOptions {
  cabecalho?: string;
  rodape?: string;
}

export class TXTService {
  async gerarTXT(conteudoHTML: string, titulo: string, options?: TXTOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');
    const startTime = Date.now();

    logger.info({ msg: '[TXT] Iniciando geração de TXT', titulo });

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      logger.info({ msg: '[TXT] Criando diretório', uploadsDir });
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo.replace(/\s+/g, '-')}.txt`;
    const filepath = path.join(uploadsDir, filename);

    logger.info({ msg: '[TXT] Arquivo será salvo', filepath });

    try {
      // Converter HTML para texto limpo
      logger.info('[TXT] Convertendo HTML para texto');
      const conteudoTexto = convert(conteudoHTML, {
        wordwrap: 80,
        preserveNewlines: true,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' }
        ]
      });

      let conteudoCompleto = '';

      // Cabeçalho
      if (options?.cabecalho) {
        conteudoCompleto += options.cabecalho + '\n';
        conteudoCompleto += '='.repeat(80) + '\n\n';
      } else {
        conteudoCompleto += 'ADVOCACIA PITANGA\n';
        conteudoCompleto += '='.repeat(80) + '\n\n';
      }

      // Título
      conteudoCompleto += titulo.toUpperCase() + '\n';
      conteudoCompleto += '-'.repeat(80) + '\n\n';

      // Conteúdo principal (já convertido de HTML)
      conteudoCompleto += conteudoTexto + '\n\n';

      // Rodapé
      if (options?.rodape) {
        conteudoCompleto += '='.repeat(80) + '\n';
        conteudoCompleto += options.rodape + '\n';
      }

      // Timestamp
      const dataHora = new Date().toLocaleString('pt-BR');
      conteudoCompleto += '\n' + '-'.repeat(80) + '\n';
      conteudoCompleto += `Documento gerado em: ${dataHora}\n`;

      // Escrever arquivo
      logger.info('[TXT] Salvando arquivo');
      fs.writeFileSync(filepath, conteudoCompleto, 'utf-8');

      const duration = Date.now() - startTime;
      logger.info({
        msg: '[TXT] TXT gerado com sucesso',
        filepath,
        duration: `${duration}ms`
      });

      return filepath;
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
