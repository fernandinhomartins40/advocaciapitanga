/**
 * Script para migrar sintaxe de logger Winston para Pino
 *
 * Winston: logger.info({ msg: 'mensagem', data })
 * Pino: logger.info({ msg: 'mensagem', data })
 */

import fs from 'fs';
import path from 'path';

function fixLoggerSyntax(content: string): string {
  // Regex para capturar logger.LEVEL('mensagem', { data })
  // e converter para logger.LEVEL({ msg: 'mensagem', data })

  const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  let fixed = content;

  for (const level of logLevels) {
    // Padrão: logger.level('mensagem', { objeto })
    const regex1 = new RegExp(
      `logger\\.${level}\\((['"\`])([^'"\`]+)\\1,\\s*({[^}]+})\\)`,
      'g'
    );

    fixed = fixed.replace(regex1, (match, quote, msg, obj) => {
      // Remover última chave do objeto
      const objWithoutBrace = obj.slice(0, -1).trim();

      // Se objeto está vazio {}, usar apenas msg
      if (objWithoutBrace === '{') {
        return `logger.${level}(${quote}${msg}${quote})`;
      }

      // Caso contrário, mesclar msg com objeto
      return `logger.${level}({ msg: ${quote}${msg}${quote}, ${objWithoutBrace.substring(1).trim()} })`;
    });

    // Padrão: logger.level('mensagem') - já está correto, mas converter para objeto se necessário
    // Deixar como está pois string simples é aceito pelo Pino
  }

  return fixed;
}

function processFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixLoggerSyntax(content);

  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
  }
}

function processDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

// Executar
const srcDir = path.join(__dirname, '..');
console.log('Migrando sintaxe de logger...');
processDirectory(srcDir);
console.log('✓ Migração concluída!');
