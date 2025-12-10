/**
 * Script de migração para normalizar números de processos
 * Adiciona a máscara CNJ aos processos já cadastrados
 *
 * Formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
 *
 * Uso:
 * npx tsx src/scripts/normalizar-numeros-processo.ts
 */

import { prisma } from 'database';

/**
 * Normaliza o número do processo para o formato CNJ
 */
function normalizarNumeroProcesso(numero: string): string {
  // Remove tudo exceto dígitos
  const apenasNumeros = numero.replace(/\D/g, '');

  // Se não tiver 20 dígitos, retorna o número original
  if (apenasNumeros.length !== 20) {
    console.log(`⚠️  Número inválido (${apenasNumeros.length} dígitos): ${numero}`);
    return numero;
  }

  // Formata: NNNNNNN-DD.AAAA.J.TT.OOOO
  const formatado = `${apenasNumeros.slice(0, 7)}-${apenasNumeros.slice(7, 9)}.${apenasNumeros.slice(9, 13)}.${apenasNumeros.slice(13, 14)}.${apenasNumeros.slice(14, 16)}.${apenasNumeros.slice(16, 20)}`;

  return formatado;
}

/**
 * Executa a migração
 */
async function executarMigracao() {
  console.log('🚀 Iniciando migração de números de processo...\n');

  try {
    // Buscar todos os processos
    const processos = await prisma.processo.findMany({
      select: {
        id: true,
        numero: true,
      },
    });

    console.log(`📊 Total de processos encontrados: ${processos.length}\n`);

    let processadosComSucesso = 0;
    let jaFormatados = 0;
    let comErro = 0;
    let invalidos = 0;

    // Processar cada processo
    for (const processo of processos) {
      const numeroOriginal = processo.numero;
      const numeroNormalizado = normalizarNumeroProcesso(numeroOriginal);

      // Se já está formatado, pula
      if (numeroOriginal === numeroNormalizado) {
        jaFormatados++;
        console.log(`✓ Já formatado: ${numeroOriginal}`);
        continue;
      }

      // Se é inválido, apenas registra
      if (numeroOriginal.replace(/\D/g, '').length !== 20) {
        invalidos++;
        console.log(`✗ Inválido: ${numeroOriginal} (não tem 20 dígitos)`);
        continue;
      }

      try {
        // Atualizar processo
        await prisma.processo.update({
          where: { id: processo.id },
          data: { numero: numeroNormalizado },
        });

        processadosComSucesso++;
        console.log(`✓ Atualizado: ${numeroOriginal} → ${numeroNormalizado}`);
      } catch (error: any) {
        comErro++;
        console.error(`✗ Erro ao atualizar ${numeroOriginal}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 RELATÓRIO DA MIGRAÇÃO');
    console.log('='.repeat(60));
    console.log(`Total de processos:        ${processos.length}`);
    console.log(`✓ Atualizados com sucesso: ${processadosComSucesso}`);
    console.log(`✓ Já formatados:           ${jaFormatados}`);
    console.log(`✗ Com erro:                ${comErro}`);
    console.log(`⚠️  Inválidos (< 20 díg):   ${invalidos}`);
    console.log('='.repeat(60));

    if (comErro > 0) {
      console.log('\n⚠️  Atenção: Alguns processos não foram atualizados. Verifique os erros acima.');
    } else if (invalidos > 0) {
      console.log('\n⚠️  Atenção: Existem processos com números inválidos que precisam ser corrigidos manualmente.');
    } else {
      console.log('\n✅ Migração concluída com sucesso!');
    }

  } catch (error: any) {
    console.error('\n❌ Erro ao executar migração:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
executarMigracao()
  .then(() => {
    console.log('\n✅ Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado com erro:', error);
    process.exit(1);
  });
