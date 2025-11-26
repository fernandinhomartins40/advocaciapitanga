import fs from 'fs';
import path from 'path';

export interface TXTOptions {
  cabecalho?: string;
  rodape?: string;
}

export class TXTService {
  async gerarTXT(conteudo: string, titulo: string, options?: TXTOptions): Promise<string> {
    const uploadsDir = path.join(__dirname, '../../uploads/documentos-gerados');

    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${titulo.replace(/\s+/g, '-')}.txt`;
    const filepath = path.join(uploadsDir, filename);

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

    // Conteúdo principal
    conteudoCompleto += conteudo + '\n\n';

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
    fs.writeFileSync(filepath, conteudoCompleto, 'utf-8');

    return filepath;
  }
}
