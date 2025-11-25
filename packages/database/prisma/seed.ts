import { PrismaClient, Role, StatusProcesso } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.mensagem.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.processo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.advogado.deleteMany();
  await prisma.user.deleteMany();

  // Hash da senha padrão
  const senhaHash = await bcrypt.hash('admin123', 10);
  const senhaCliente = await bcrypt.hash('cliente123', 10);

  // Criar Advogado
  const advogado = await prisma.user.create({
    data: {
      email: 'admin@pitanga.com',
      password: senhaHash,
      nome: 'Dr. João Silva',
      role: Role.ADVOGADO,
      advogado: {
        create: {
          oab: 'SP123456',
          telefone: '(11) 98765-4321',
        },
      },
    },
  });

  console.log('✅ Advogado criado:', advogado.email);

  // Criar Clientes
  const cliente1 = await prisma.user.create({
    data: {
      email: 'maria@email.com',
      password: senhaCliente,
      nome: 'Maria Santos',
      role: Role.CLIENTE,
      cliente: {
        create: {
          cpf: '123.456.789-00',
          telefone: '(11) 91234-5678',
          endereco: 'Rua das Flores, 123 - São Paulo/SP',
        },
      },
    },
  });

  const cliente2 = await prisma.user.create({
    data: {
      email: 'jose@email.com',
      password: senhaCliente,
      nome: 'José Oliveira',
      role: Role.CLIENTE,
      cliente: {
        create: {
          cpf: '987.654.321-00',
          telefone: '(11) 92345-6789',
          endereco: 'Av. Paulista, 1000 - São Paulo/SP',
        },
      },
    },
  });

  console.log('✅ Clientes criados');

  // Criar Processos
  const processo1 = await prisma.processo.create({
    data: {
      numero: '1234567-89.2024.8.26.0100',
      descricao: 'Ação de indenização por danos morais decorrente de acidente de trânsito',
      status: StatusProcesso.EM_ANDAMENTO,
      clienteId: cliente1.cliente!.id,
      advogadoId: advogado.advogado!.id,
    },
  });

  const processo2 = await prisma.processo.create({
    data: {
      numero: '9876543-21.2024.8.26.0200',
      descricao: 'Revisão de contrato trabalhista com pedido de verbas rescisórias',
      status: StatusProcesso.EM_ANDAMENTO,
      clienteId: cliente2.cliente!.id,
      advogadoId: advogado.advogado!.id,
    },
  });

  const processo3 = await prisma.processo.create({
    data: {
      numero: '5555555-55.2024.8.26.0300',
      descricao: 'Ação de divórcio consensual com partilha de bens',
      status: StatusProcesso.CONCLUIDO,
      clienteId: cliente1.cliente!.id,
      advogadoId: advogado.advogado!.id,
    },
  });

  console.log('✅ Processos criados');

  // Criar Mensagens de exemplo
  await prisma.mensagem.create({
    data: {
      conteudo: 'Olá, gostaria de saber o andamento do meu processo.',
      processoId: processo1.id,
      remetente: 'Cliente',
    },
  });

  await prisma.mensagem.create({
    data: {
      conteudo:
        'Olá Maria, o processo está em andamento. Estamos aguardando a resposta da outra parte. Assim que houver novidades, entrarei em contato.',
      processoId: processo1.id,
      remetente: 'Advogado',
      lida: true,
    },
  });

  await prisma.mensagem.create({
    data: {
      conteudo: 'Perfeito, obrigada pela atenção!',
      processoId: processo1.id,
      remetente: 'Cliente',
      lida: true,
    },
  });

  await prisma.mensagem.create({
    data: {
      conteudo: 'Dr. João, preciso de uma cópia do contrato. Pode me enviar?',
      processoId: processo2.id,
      remetente: 'Cliente',
    },
  });

  console.log('✅ Mensagens criadas');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('\nAdvogado:');
  console.log('  Email: admin@pitanga.com');
  console.log('  Senha: admin123');
  console.log('\nCliente 1:');
  console.log('  Email: maria@email.com');
  console.log('  Senha: cliente123');
  console.log('\nCliente 2:');
  console.log('  Email: jose@email.com');
  console.log('  Senha: cliente123\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
