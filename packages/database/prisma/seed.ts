import { PrismaClient, Role, StatusProcesso } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Verificar se já existe admin
  const adminExists = await prisma.user.findFirst({
    where: {
      email: 'admin@pitanga.com',
      role: Role.ADMIN_ESCRITORIO,
    },
  });

  if (adminExists) {
    console.log('⚠️ Usuário admin já existe. Pulando seed para não apagar dados.');
    console.log('📋 Use as credenciais existentes ou delete manualmente o usuário admin para recriar.');
    return;
  }

  console.log('✅ Banco vazio, criando dados iniciais...');

  // Limpar dados existentes (apenas se não houver admin)
  await prisma.mensagem.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.processo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.advogado.deleteMany();
  await prisma.user.deleteMany();

  // Hash de senhas seguras
  const senhaAdvogado = await bcrypt.hash('Pitanga@2024!Admin', 10);
  const senhaCliente = await bcrypt.hash('Pitanga@2024!Cliente', 10);

  // Criar Advogado Admin (Dono do Escritório)
  const advogado = await prisma.user.create({
    data: {
      email: 'admin@pitanga.com',
      password: senhaAdvogado,
      nome: 'Dr. João Silva',
      role: Role.ADMIN_ESCRITORIO,
      advogado: {
        create: {
          oab: 'SP123456',
          telefone: '(11) 98765-4321',
        },
      },
    },
    include: {
      advogado: true,
    },
  });

  console.log('✅ Advogado Admin criado:', advogado.email);

  // Criar Escritório para o Admin
  const escritorio = await prisma.escritorio.create({
    data: {
      nome: 'Escritório Pitanga & Advocacia',
      adminId: advogado.advogado!.id,
      ativo: true,
    },
  });

  // Vincular advogado ao escritório
  await prisma.advogado.update({
    where: { id: advogado.advogado!.id },
    data: { escritorioId: escritorio.id },
  });

  console.log('✅ Escritório criado:', escritorio.nome);

  // Criar Clientes
  const cliente1 = await prisma.user.create({
    data: {
      email: 'maria@email.com',
      password: senhaCliente,
      nome: 'Maria Santos',
      role: Role.CLIENTE,
      cliente: {
        create: {
          tipoPessoa: 'FISICA',
          cpf: '123.456.789-00',
          telefone: '(11) 91234-5678',
          logradouro: 'Rua das Flores',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          uf: 'SP',
          cep: '01234-567',
        },
      },
    },
    include: {
      cliente: true,
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
          tipoPessoa: 'FISICA',
          cpf: '987.654.321-00',
          telefone: '(11) 92345-6789',
          logradouro: 'Av. Paulista',
          numero: '1000',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          uf: 'SP',
          cep: '01310-100',
        },
      },
    },
    include: {
      cliente: true,
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
  console.log('  Senha: Pitanga@2024!Admin');
  console.log('\nCliente 1:');
  console.log('  Email: maria@email.com');
  console.log('  Senha: Pitanga@2024!Cliente');
  console.log('\nCliente 2:');
  console.log('  Email: jose@email.com');
  console.log('  Senha: Pitanga@2024!Cliente\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
