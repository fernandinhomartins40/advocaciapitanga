/**
 * Script de verificação para analisar números de processos
 * Verifica quais processos precisam ser normalizados SEM fazer alterações
 *
 * Uso:
 * npx tsx src/scripts/verificar-numeros-processo.ts
 */

import { prisma } from 'database';

/**
 * Normaliza o número do processo para o formato CNJ
 */
function normalizarNumeroProcesso(numero: string): string {
  const apenasNumeros = numero.replace(/\D/g, '');

  if (apenasNumeros.length !== 20) {
    return numero;
  }

  return `${apenasNumeros.slice(0, 7)}-${apenasNumeros.slice(7, 9)}.${apenasNumeros.slice(9, 13)}.${apenasNumeros.slice(13, 14)}.${apenasNumeros.slice(14, 16)}.${apenasNumeros.slice(16, 20)}`;
}

/**
 * Executa a verificação
 */
async function executarVerificacao() {
  console.log('🔍 Verificando números de processo...\n');

  try {
    const processos = await prisma.processo.findMany({
      select: {
        id: true,
        numero: true,
        cliente: {
          select: {
            user: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

    console.log(`📊 Total de processos: ${processos.length}\n`);

    const precisamAtualizacao: any[] = [];
    const jaFormatados: any[] = [];
    const invalidos: any[] = [];

    for (const processo of processos) {
      const numeroOriginal = processo.numero;
      const numeroNormalizado = normalizarNumeroProcesso(numeroOriginal);
      const apenasNumeros = numeroOriginal.replace(/\D/g, '');

      if (apenasNumeros.length !== 20) {
        invalidos.push({
          id: processo.id,
          numero: numeroOriginal,
          cliente: processo.cliente.user.nome,
          digitos: apenasNumeros.length,
        });
      } else if (numeroOriginal === numeroNormalizado) {
        jaFormatados.push({
          id: processo.id,
          numero: numeroOriginal,
        });
      } else {
        precisamAtualizacao.push({
          id: processo.id,
          de: numeroOriginal,
          para: numeroNormalizado,
          cliente: processo.cliente.user.nome,
        });
      }
    }

    console.log('='.repeat(80));
    console.log('📋 RELATÓRIO DE VERIFICAÇÃO');
    console.log('='.repeat(80));

    console.log(`\n✅ Processos já formatados corretamente: ${jaFormatados.length}`);
    if (jaFormatados.length > 0 && jaFormatados.length <= 5) {
      jaFormatados.forEach(p => {
        console.log(`   - ${p.numero}`);
      });
    }

    console.log(`\n⚠️  Processos que precisam atualização: ${precisamAtualizacao.length}`);
    if (precisamAtualizacao.length > 0) {
      console.log('\n   Exemplos:');
      precisamAtualizacao.slice(0, 10).forEach(p => {
        console.log(`   - ${p.de} → ${p.para} (Cliente: ${p.cliente})`);
      });
      if (precisamAtualizacao.length > 10) {
        console.log(`   ... e mais ${precisamAtualizacao.length - 10} processo(s)`);
      }
    }

    console.log(`\n❌ Processos com número inválido: ${invalidos.length}`);
    if (invalidos.length > 0) {
      console.log('\n   Detalhes:');
      invalidos.forEach(p => {
        console.log(`   - ${p.numero} (${p.digitos} dígitos) - Cliente: ${p.cliente}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO');
    console.log('='.repeat(80));
    console.log(`Total:              ${processos.length}`);
    console.log(`Já formatados:      ${jaFormatados.length} (${((jaFormatados.length / processos.length) * 100).toFixed(1)}%)`);
    console.log(`Precisam atualizar: ${precisamAtualizacao.length} (${((precisamAtualizacao.length / processos.length) * 100).toFixed(1)}%)`);
    console.log(`Inválidos:          ${invalidos.length} (${((invalidos.length / processos.length) * 100).toFixed(1)}%)`);
    console.log('='.repeat(80));

    if (precisamAtualizacao.length > 0) {
      console.log('\n💡 Para normalizar os processos, execute:');
      console.log('   npx tsx src/scripts/normalizar-numeros-processo.ts');
    }

    if (invalidos.length > 0) {
      console.log('\n⚠️  ATENÇÃO: Processos inválidos precisam ser corrigidos manualmente no banco de dados.');
    }

  } catch (error: any) {
    console.error('\n❌ Erro ao executar verificação:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar verificação
executarVerificacao()
  .then(() => {
    console.log('\n✅ Verificação concluída.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verificação finalizada com erro:', error);
    process.exit(1);
  });
