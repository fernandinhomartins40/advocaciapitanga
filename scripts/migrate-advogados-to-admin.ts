/**
 * Script de Migração: Converter Advogados Existentes em ADMIN_ESCRITORIO
 *
 * Este script:
 * 1. Identifica todos os advogados com role 'ADVOGADO'
 * 2. Cria um escritório para cada advogado
 * 3. Atualiza o role para 'ADMIN_ESCRITORIO'
 * 4. Vincula o advogado ao escritório criado
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrarAdvogados() {
  console.log('🚀 Iniciando migração de advogados para ADMIN_ESCRITORIO...\n');

  try {
    // Buscar todos os advogados
    const advogados = await prisma.advogado.findMany({
      include: {
        user: true,
      },
    });

    console.log(`📊 Encontrados ${advogados.length} advogados\n`);

    let migrados = 0;
    let erros = 0;

    for (const advogado of advogados) {
      try {
        console.log(`\n👤 Processando: ${advogado.user.nome} (${advogado.user.email})`);

        // Verificar se já tem escritório
        const escritorioExistente = await prisma.escritorio.findFirst({
          where: { adminId: advogado.id },
        });

        if (escritorioExistente) {
          console.log(`   ✅ Já possui escritório: ${escritorioExistente.nome}`);
          migrados++;
          continue;
        }

        // Criar escritório para o advogado
        const nomeEscritorio = `Escritório ${advogado.user.nome}`;

        const escritorio = await prisma.escritorio.create({
          data: {
            nome: nomeEscritorio,
            adminId: advogado.id,
            ativo: true,
          },
        });

        console.log(`   📁 Escritório criado: ${escritorio.nome}`);

        // Atualizar role do usuário para ADMIN_ESCRITORIO
        await prisma.user.update({
          where: { id: advogado.userId },
          data: { role: 'ADMIN_ESCRITORIO' },
        });

        console.log(`   🔐 Role atualizado: ADMIN_ESCRITORIO`);

        // Vincular advogado ao escritório
        await prisma.advogado.update({
          where: { id: advogado.id },
          data: { escritorioId: escritorio.id },
        });

        console.log(`   🔗 Advogado vinculado ao escritório`);
        console.log(`   ✅ Migração concluída!`);

        migrados++;
      } catch (error: any) {
        console.error(`   ❌ Erro ao migrar: ${error.message}`);
        erros++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`\n📈 Resumo da Migração:`);
    console.log(`   ✅ Migrados com sucesso: ${migrados}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📊 Total processado: ${advogados.length}\n`);

    if (erros === 0) {
      console.log('✨ Migração concluída com sucesso!\n');
    } else {
      console.log('⚠️  Migração concluída com alguns erros. Verifique os logs acima.\n');
    }
  } catch (error: any) {
    console.error('\n❌ Erro fatal durante a migração:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
migrarAdvogados()
  .then(() => {
    console.log('👋 Finalizando...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });
