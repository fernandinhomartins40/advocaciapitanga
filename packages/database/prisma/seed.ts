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

  // Verificar se biblioteca de modelos já existe (completa)
  const templatesCount = await prisma.documentTemplate.count();
  const foldersCount = await prisma.documentFolder.count();

  // Consideramos biblioteca completa com 30+ templates e 8 folders
  const bibliotecaCompleta = templatesCount >= 30 && foldersCount >= 8;

  if (adminExists && bibliotecaCompleta) {
    console.log('⚠️ Dados já existem. Pulando seed para não duplicar dados.');
    console.log(`📋 Admin existe | Templates: ${templatesCount} | Folders: ${foldersCount}`);
    return;
  }

  if (adminExists) {
    console.log('✅ Admin já existe. Verificando biblioteca de documentos...');
  } else {
    console.log('✅ Banco vazio, criando dados iniciais...');
  }

  // Variáveis que serão usadas em todo o seed
  let advogado: any;
  let escritorio: any;
  let cliente1: any;
  let cliente2: any;
  let processo1: any;
  let processo2: any;
  let processo3: any;

  // Se admin não existe, criar todos os dados de usuários e processos
  if (!adminExists) {
    console.log('🗑️ Limpando dados existentes...');
    await prisma.documentHistory.deleteMany();
    await prisma.documento.deleteMany();
    await prisma.documentTemplate.deleteMany();
    await prisma.documentFolder.deleteMany();
    await prisma.mensagem.deleteMany();
    await prisma.processo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.advogado.deleteMany();
    await prisma.user.deleteMany();

    // Hash de senhas seguras
    const senhaAdvogado = await bcrypt.hash('Pitanga@2024!Admin', 10);
    const senhaCliente = await bcrypt.hash('Pitanga@2024!Cliente', 10);

    // Criar Advogado Admin (Dono do Escritório)
    advogado = await prisma.user.create({
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

    processo3 = await prisma.processo.create({
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

    console.log('\n🎉 Dados de usuários e processos criados com sucesso!');
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

  // Biblioteca de Documentos - SEMPRE verifica e cria se não estiver completa
  if (!bibliotecaCompleta) {
    console.log(`📚 Criando biblioteca de modelos de documentos... (atual: ${templatesCount} templates, ${foldersCount} folders)`);

    // Limpar templates e folders existentes para recriar completo
    if (templatesCount > 0 || foldersCount > 0) {
      console.log('🗑️ Limpando biblioteca incompleta para recriar...');
      await prisma.documentTemplate.deleteMany();
      await prisma.documentFolder.deleteMany();
    }

    const pastaModelos = await prisma.documentFolder.create({
      data: { nome: 'Modelos Padrão' },
    });

    const pastaCiveis = await prisma.documentFolder.create({
      data: { nome: 'Cível', parentId: pastaModelos.id },
    });

    const pastaTrabalhistas = await prisma.documentFolder.create({
      data: { nome: 'Trabalhista', parentId: pastaModelos.id },
    });

    const pastaFamilia = await prisma.documentFolder.create({
      data: { nome: 'Família e Sucessões', parentId: pastaModelos.id },
    });

    const pastaConsumidor = await prisma.documentFolder.create({
      data: { nome: 'Direito do Consumidor', parentId: pastaModelos.id },
    });

    const pastaContratos = await prisma.documentFolder.create({
      data: { nome: 'Contratos', parentId: pastaModelos.id },
    });

    const pastaPrevidenciario = await prisma.documentFolder.create({
      data: { nome: 'Previdenciário', parentId: pastaModelos.id },
    });

    const pastaRecursos = await prisma.documentFolder.create({
      data: { nome: 'Recursos', parentId: pastaModelos.id },
    });

    await prisma.documentTemplate.createMany({
    data: [
      {
        nome: 'Petição Inicial - Indenização por Danos Morais',
        descricao: 'Modelo base para ações indenizatórias cíveis',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">PETIÇÃO INICIAL - AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS</h2>

<p>{{ cliente_nome }}, nacionalidade, estado civil, profissão, portador do CPF {{ cliente_cpf }}, residente e domiciliado à {{ cliente_endereco }}, por intermédio de seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor</p>

<h3 style="text-align: center;">AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS</h3>

<p>em face de {{ reu_nome }}, pelos fatos e fundamentos jurídicos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>{{ narrativa_fatos }}</p>

<h3>II - DO DIREITO</h3>

<p>O dano moral configura-se pela violação dos direitos da personalidade, conforme previsto nos artigos 186 e 927 do Código Civil.</p>

<p>No caso em tela, restou evidenciado o dano moral sofrido pelo autor, uma vez que {{ descricao_processo }}.</p>

<h3>III - DO PEDIDO</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A citação do réu para, querendo, contestar a presente ação, sob pena de revelia e confissão;</p>

<p>b) A condenação do réu ao pagamento de indenização por danos morais no valor de R$ {{ valor_causa }};</p>

<p>c) A condenação do réu ao pagamento de custas processuais e honorários advocatícios;</p>

<p>d) A produção de todos os meios de prova em direito admitidos.</p>

<p>Dá-se à causa o valor de R$ {{ valor_causa }}.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Contestação - Responsabilidade Civil',
        descricao: 'Modelo de contestação com preliminares e mérito',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___</strong></p>

<p>Processo nº {{ processo_numero }}</p>

<h2 style="text-align: center;">CONTESTAÇÃO</h2>

<p>{{ cliente_nome }}, já qualificado nos autos da ação em epígrafe que lhe move {{ reu_nome }}, vem, por intermédio de seu advogado, apresentar</p>

<h3 style="text-align: center;">CONTESTAÇÃO</h3>

<p>pelos fundamentos de fato e de direito a seguir aduzidos:</p>

<h3>I - PRELIMINARMENTE</h3>

<p>[Inserir preliminares se aplicável - ilegitimidade, incompetência, etc.]</p>

<h3>II - DO MÉRITO</h3>

<p>Os fatos narrados na inicial não correspondem à verdade, senão vejamos:</p>

<p>{{ narrativa_fatos }}</p>

<p>A pretensão autoral carece de fundamento jurídico, uma vez que:</p>

<p>1) Não houve comprovação do alegado dano;<br>
2) Inexiste nexo de causalidade entre a conduta e o suposto dano;<br>
3) O valor pleiteado é exorbitante e não encontra amparo legal.</p>

<h3>III - DO PEDIDO</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) O acolhimento das preliminares arguidas, com extinção do processo sem resolução de mérito;</p>

<p>b) Subsidiariamente, a improcedência total dos pedidos autorais;</p>

<p>c) A condenação do autor ao pagamento de custas processuais e honorários advocatícios.</p>

<p>Protesta provar o alegado por todos os meios de prova em direito admitidos.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Procuração ad judicia',
        descricao: 'Procuração padrão para representação em juízo',
        conteudo: `<h2 style="text-align: center;">PROCURAÇÃO</h2>

<p><strong>OUTORGANTE:</strong> {{ cliente_nome }}, nacionalidade, estado civil, profissão, portador do CPF {{ cliente_cpf }}, residente e domiciliado à {{ cliente_endereco }}.</p>

<p><strong>OUTORGADO:</strong> {{ advogado_nome }}, advogado, inscrito na OAB/{{ advogado_oab }}.</p>

<p><strong>PODERES:</strong> Pelo presente instrumento particular de procuração, o OUTORGANTE nomeia e constitui seu bastante procurador o OUTORGADO, a quem confere amplos e gerais poderes para o foro em geral, com a cláusula "ad judicia", podendo propor, em nome do outorgante, as ações que julgar convenientes, acompanhá-las e receber citações e intimações, confessar, transigir, desistir, firmar compromissos ou acordos, receber e dar quitação, podendo ainda substabelecer esta em outrem, com ou sem reserva de iguais poderes.</p>

<p>Local e data.</p>

<p>_______________________________<br>{{ cliente_nome }}<br>CPF: {{ cliente_cpf }}</p>`,
        folderId: pastaModelos.id,
      },
      {
        nome: 'Reclamação Trabalhista',
        descricao: 'Modelo de reclamação trabalhista com verbas rescisórias',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA ___ VARA DO TRABALHO DE ___</strong></p>

<h2 style="text-align: center;">RECLAMAÇÃO TRABALHISTA</h2>

<p><strong>RECLAMANTE:</strong> {{ cliente_nome }}<br>
<strong>CPF:</strong> {{ cliente_cpf }}<br>
<strong>Endereço:</strong> {{ cliente_endereco }}</p>

<p><strong>RECLAMADA:</strong> {{ reu_nome }}</p>

<p>O RECLAMANTE, por intermédio de seu advogado subscritor, vem, respeitosamente, à presença de Vossa Excelência, propor</p>

<h3 style="text-align: center;">RECLAMAÇÃO TRABALHISTA</h3>

<p>em face da RECLAMADA, pelos fatos e fundamentos a seguir expostos:</p>

<h3>I - DA RELAÇÃO DE EMPREGO</h3>

<p>O Reclamante foi admitido em [data de admissão], exercendo a função de [cargo], mediante remuneração mensal de R$ [salário].</p>

<p>O vínculo empregatício perdurou até [data de demissão], quando foi dispensado sem justa causa.</p>

<h3>II - DA NARRATIVA DOS FATOS</h3>

<p>{{ narrativa_fatos }}</p>

<h3>III - DO DIREITO</h3>

<p>A Reclamada deixou de pagar as seguintes verbas rescisórias:</p>

<p>a) Aviso prévio indenizado (Art. 487, CLT);<br>
b) Férias vencidas e proporcionais acrescidas de 1/3 constitucional (Art. 146, CLT);<br>
c) 13º salário proporcional (Lei 4.090/62);<br>
d) Saldo de salário;<br>
e) FGTS com multa de 40% (Art. 18, §1º, Lei 8.036/90);<br>
f) Multa do Art. 477, §8º da CLT.</p>

<h3>IV - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A citação da Reclamada;</p>

<p>b) A condenação ao pagamento das verbas acima discriminadas;</p>

<p>c) A condenação em custas processuais e honorários advocatícios;</p>

<p>d) A produção de todos os meios de prova em direito admitidos.</p>

<p>Dá-se à causa o valor de R$ {{ valor_causa }}.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaTrabalhistas.id,
      },
      {
        nome: 'Contrato de Prestação de Serviços Advocatícios',
        descricao: 'Contrato para formalizar honorários advocatícios',
        conteudo: `<h2 style="text-align: center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</h2>

<p><strong>CONTRATANTE:</strong> {{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.</p>

<p><strong>CONTRATADO:</strong> {{ advogado_nome }}, advogado inscrito na OAB/{{ advogado_oab }}.</p>

<p>As partes acima qualificadas celebram o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS, mediante as seguintes cláusulas e condições:</p>

<h3>CLÁUSULA PRIMEIRA - DO OBJETO</h3>
<p>O presente contrato tem por objeto a prestação de serviços advocatícios pelo CONTRATADO ao CONTRATANTE, referente a: {{ descricao_processo }}</p>

<h3>CLÁUSULA SEGUNDA - DOS HONORÁRIOS</h3>
<p>Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO honorários no valor de {{ honorarios }}, a ser pago da seguinte forma: [condições de pagamento].</p>

<h3>CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO CONTRATADO</h3>
<p>O CONTRATADO obriga-se a:<br>
a) Prestar os serviços advocatícios com zelo e diligência;<br>
b) Manter o CONTRATANTE informado sobre o andamento do processo;<br>
c) Guardar sigilo sobre todas as informações recebidas.</p>

<h3>CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATANTE</h3>
<p>O CONTRATANTE obriga-se a:<br>
a) Fornecer todas as informações e documentos necessários;<br>
b) Efetuar o pagamento dos honorários na forma acordada;<br>
c) Arcar com custas processuais e despesas correlatas.</p>

<h3>CLÁUSULA QUINTA - DO FORO</h3>
<p>Fica eleito o foro da comarca de ___ para dirimir quaisquer questões oriundas deste contrato.</p>

<p>E, por estarem assim justos e contratados, firmam o presente instrumento em duas vias de igual teor.</p>

<p>Local e data.</p>

<p>_______________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_______________________________<br>
{{ cliente_nome }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ advogado_nome }}<br>
CONTRATANTE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OAB/{{ advogado_oab }}</p>`,
        folderId: pastaModelos.id,
      },
      {
        nome: 'Recurso de Apelação',
        descricao: 'Modelo de recurso de apelação cível',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR RELATOR DO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___</strong></p>

<p>Processo nº {{ processo_numero }}</p>

<h2 style="text-align: center;">RECURSO DE APELAÇÃO</h2>

<p>{{ cliente_nome }}, já qualificado nos autos do processo em epígrafe, inconformado com a r. sentença proferida às fls. ___, que [resultado da sentença], vem, por intermédio de seu advogado, interpor</p>

<h3 style="text-align: center;">RECURSO DE APELAÇÃO</h3>

<p>com fundamento no artigo 1.009 do Código de Processo Civil, pelas razões de fato e de direito a seguir aduzidas:</p>

<h3>I - DA TEMPESTIVIDADE</h3>

<p>O presente recurso é tempestivo, conforme se verifica pela publicação da sentença em [data].</p>

<h3>II - DO CABIMENTO</h3>

<p>O recurso de apelação é o meio adequado para impugnar a sentença que [fundamentação].</p>

<h3>III - DOS FATOS</h3>

<p>{{ narrativa_fatos }}</p>

<h3>IV - DO DIREITO</h3>

<p>A r. sentença recorrida merece reforma pelos seguintes fundamentos:</p>

<p>1) [Primeiro fundamento];<br>
2) [Segundo fundamento];<br>
3) [Terceiro fundamento].</p>

<h3>V - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) O recebimento do presente recurso;</p>

<p>b) A reforma da sentença recorrida para [pedido específico];</p>

<p>c) A condenação do apelado em custas processuais e honorários advocatícios.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Agravo de Instrumento',
        descricao: 'Modelo de agravo de instrumento',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR RELATOR DO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___</strong></p>

<p>Processo nº {{ processo_numero }}</p>

<h2 style="text-align: center;">AGRAVO DE INSTRUMENTO</h2>

<p>{{ cliente_nome }}, já qualificado nos autos do processo originário em epígrafe, vem, por intermédio de seu advogado subscritor, interpor</p>

<h3 style="text-align: center;">AGRAVO DE INSTRUMENTO</h3>

<p>com fulcro no artigo 1.015 do Código de Processo Civil, em face da r. decisão interlocutória proferida às fls. ___, pelos fundamentos a seguir expostos:</p>

<h3>I - DA TEMPESTIVIDADE E CABIMENTO</h3>

<p>O presente recurso é tempestivo e cabível, nos termos do art. 1.015 do CPC.</p>

<h3>II - DA DECISÃO AGRAVADA</h3>

<p>A decisão agravada determinou [descrição da decisão], causando grave prejuízo ao agravante.</p>

<h3>III - DOS FATOS</h3>

<p>{{ narrativa_fatos }}</p>

<h3>IV - DO DIREITO</h3>

<p>A decisão merece reforma pelos seguintes fundamentos:</p>

<p>[Fundamentação jurídica detalhada]</p>

<h3>V - DO PEDIDO LIMINAR</h3>

<p>Requer-se a concessão de efeito suspensivo/ativo ao presente agravo.</p>

<h3>VI - DOS PEDIDOS FINAIS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A concessão de efeito suspensivo;<br>
b) O provimento do recurso para reformar a decisão agravada;<br>
c) A intimação do agravado para contrarrazões.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaRecursos.id,
      },

      // DIREITO DE FAMÍLIA E SUCESSÕES
      {
        nome: 'Ação de Divórcio Consensual',
        descricao: 'Modelo de divórcio com acordo entre as partes',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA DE FAMÍLIA E SUCESSÕES DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE DIVÓRCIO CONSENSUAL</h2>

<p>{{ cliente_nome }}, nacionalidade, estado civil, profissão, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, e {{ reu_nome }}, já qualificado nos autos, vêm, por seus advogados, requerer</p>

<h3 style="text-align: center;">DIVÓRCIO CONSENSUAL</h3>

<p>com fundamento no art. 731 do CPC, pelos fundamentos de fato e de direito a seguir expostos:</p>

<h3>I - DO CASAMENTO</h3>

<p>Os requerentes contraíram matrimônio em [data], conforme certidão em anexo.</p>

<h3>II - DA INEXISTÊNCIA DE BENS A PARTILHAR</h3>

<p>Declaram os requerentes que não possuem bens a partilhar, conforme declaração em anexo.</p>

<h3>III - DOS FILHOS</h3>

<p>[Não há filhos menores ou incapazes] OU [Há filhos menores, conforme acordo de guarda e alimentos em anexo]</p>

<h3>IV - DOS PEDIDOS</h3>

<p>Diante do exposto, requerem:</p>

<p>a) A decretação do divórcio consensual;<br>
b) A expedição de mandado para averbação junto ao Cartório competente.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaFamilia.id,
      },
      {
        nome: 'Ação de Alimentos',
        descricao: 'Pedido de pensão alimentícia',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA DE FAMÍLIA DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE ALIMENTOS</h2>

<p>{{ cliente_nome }}, menor impúbere, representado por sua genitora [nome da mãe], vem, por intermédio de seu advogado, propor</p>

<h3 style="text-align: center;">AÇÃO DE ALIMENTOS</h3>

<p>em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>O requerido é genitor do autor, conforme certidão de nascimento em anexo.</p>

<p>{{ narrativa_fatos }}</p>

<h3>II - DO DIREITO</h3>

<p>O dever de prestar alimentos decorre do poder familiar, nos termos dos artigos 1.694 e seguintes do Código Civil.</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A fixação de alimentos provisórios no percentual de 30% dos rendimentos líquidos do requerido;<br>
b) A citação do requerido;<br>
c) A condenação definitiva ao pagamento de alimentos no valor de R$ {{ valor_causa }} ou percentual sobre os rendimentos.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaFamilia.id,
      },
      {
        nome: 'Inventário e Partilha',
        descricao: 'Abertura de inventário judicial',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA DE FAMÍLIA E SUCESSÕES DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">INVENTÁRIO E PARTILHA</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, na qualidade de herdeiro de [nome do falecido], vem requerer</p>

<h3 style="text-align: center;">ABERTURA DE INVENTÁRIO E PARTILHA</h3>

<p>pelos fundamentos a seguir expostos:</p>

<h3>I - DO FALECIMENTO</h3>

<p>O(a) falecido(a) [nome] veio a falecer em [data], conforme certidão de óbito em anexo.</p>

<h3>II - DOS HERDEIROS</h3>

<p>São herdeiros do falecido:<br>
- {{ cliente_nome }}, CPF {{ cliente_cpf }}<br>
- [Demais herdeiros]</p>

<h3>III - DOS BENS</h3>

<p>O espólio é composto pelos seguintes bens:<br>
{{ narrativa_fatos }}</p>

<h3>IV - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A abertura do inventário;<br>
b) A nomeação do requerente como inventariante;<br>
c) A citação dos herdeiros e interessados;<br>
d) A avaliação e partilha dos bens.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaFamilia.id,
      },

      // DIREITO DO CONSUMIDOR
      {
        nome: 'Reclamação - Defeito no Produto',
        descricao: 'Ação de reparação por vício do produto',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">RECLAMAÇÃO - DEFEITO NO PRODUTO</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">RECLAMAÇÃO</h3>

<p>em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>Em [data], o reclamante adquiriu [produto], no valor de R$ {{ valor_causa }}.</p>

<p>{{ narrativa_fatos }}</p>

<p>O produto apresentou defeito dentro do prazo de garantia, e a reclamada se recusou a reparar ou substituir o bem.</p>

<h3>II - DO DIREITO</h3>

<p>O Código de Defesa do Consumidor (Lei 8.078/90) garante ao consumidor o direito à reparação por vício do produto (arts. 18 e seguintes).</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A condenação da reclamada à restituição do valor pago (R$ {{ valor_causa }});<br>
b) Indenização por danos morais no valor de R$ [valor];<br>
c) Inversão do ônus da prova.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaConsumidor.id,
      },
      {
        nome: 'Ação contra Plano de Saúde',
        descricao: 'Obrigação de fazer - cobertura de procedimento',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE OBRIGAÇÃO DE FAZER C/C INDENIZAÇÃO POR DANOS MORAIS</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">AÇÃO DE OBRIGAÇÃO DE FAZER</h3>

<p>em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>O autor é beneficiário do plano de saúde operado pela ré, mediante pagamento regular de mensalidades.</p>

<p>{{ narrativa_fatos }}</p>

<p>A ré negou indevidamente cobertura para [procedimento], violando o contrato e a legislação consumerista.</p>

<h3>II - DO DIREITO</h3>

<p>A recusa é abusiva e viola o CDC (art. 51, IV) e a Lei 9.656/98.</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) TUTELA DE URGÊNCIA para determinar a imediata cobertura do procedimento;<br>
b) A condenação da ré à obrigação de fazer (autorizar o procedimento);<br>
c) Indenização por danos morais no valor de R$ {{ valor_causa }};<br>
d) Condenação em custas e honorários.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaConsumidor.id,
      },
      {
        nome: 'Revisão de Contrato Bancário',
        descricao: 'Ação revisional de cláusulas abusivas',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO REVISIONAL DE CONTRATO BANCÁRIO</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">AÇÃO REVISIONAL DE CONTRATO</h3>

<p>em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>O autor celebrou contrato de [tipo de contrato] com a ré em [data].</p>

<p>{{ narrativa_fatos }}</p>

<p>O contrato contém cláusulas abusivas: juros exorbitantes, capitalização irregular, tarifas indevidas.</p>

<h3>II - DO DIREITO</h3>

<p>As cláusulas violam o CDC (arts. 39, 51) e legislação bancária.</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A revisão das cláusulas contratuais abusivas;<br>
b) A limitação dos juros aos índices legais;<br>
c) A restituição em dobro dos valores cobrados indevidamente;<br>
d) A consignação em pagamento dos valores corretos;<br>
e) Condenação em custas e honorários.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaConsumidor.id,
      },

      // CONTRATOS
      {
        nome: 'Contrato de Locação Residencial',
        descricao: 'Modelo de contrato de aluguel residencial',
        conteudo: `<h2 style="text-align: center;">CONTRATO DE LOCAÇÃO RESIDENCIAL</h2>

<p><strong>LOCADOR:</strong> {{ cliente_nome }}, CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.</p>

<p><strong>LOCATÁRIO:</strong> {{ reu_nome }}, CPF ___, residente à ___.</p>

<p>Pelo presente instrumento, as partes acima qualificadas celebram CONTRATO DE LOCAÇÃO:</p>

<h3>CLÁUSULA PRIMEIRA - DO OBJETO</h3>
<p>O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado à [endereço completo], para fins exclusivamente residenciais.</p>

<h3>CLÁUSULA SEGUNDA - DO PRAZO</h3>
<p>O prazo de locação é de [___] meses, iniciando-se em [data] e findando em [data].</p>

<h3>CLÁUSULA TERCEIRA - DO VALOR E FORMA DE PAGAMENTO</h3>
<p>O valor mensal do aluguel é de R$ {{ valor_causa }}, a ser pago até o dia [__] de cada mês.</p>

<h3>CLÁUSULA QUARTA - DO REAJUSTE</h3>
<p>O aluguel será reajustado anualmente pelo IGP-M ou índice que vier a substituí-lo.</p>

<h3>CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO LOCATÁRIO</h3>
<p>a) Pagar pontualmente o aluguel e encargos;<br>
b) Conservar o imóvel em bom estado;<br>
c) Restituir o imóvel nas mesmas condições.</p>

<h3>CLÁUSULA SEXTA - DAS MULTAS</h3>
<p>O atraso no pagamento sujeitará o locatário a multa de 10% sobre o valor.</p>

<h3>CLÁUSULA SÉTIMA - DO FORO</h3>
<p>Fica eleito o foro da comarca de ___.</p>

<p>Local e data.</p>

<p>_______________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_______________________________<br>
{{ cliente_nome }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ reu_nome }}<br>
LOCADOR&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;LOCATÁRIO</p>`,
        folderId: pastaContratos.id,
      },
      {
        nome: 'Contrato de Compra e Venda',
        descricao: 'Modelo de contrato de compra e venda de bem móvel',
        conteudo: `<h2 style="text-align: center;">CONTRATO DE COMPRA E VENDA</h2>

<p><strong>VENDEDOR:</strong> {{ cliente_nome }}, CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.</p>

<p><strong>COMPRADOR:</strong> {{ reu_nome }}, CPF ___, residente à ___.</p>

<p>Pelo presente instrumento, as partes celebram CONTRATO DE COMPRA E VENDA:</p>

<h3>CLÁUSULA PRIMEIRA - DO OBJETO</h3>
<p>O VENDEDOR vende ao COMPRADOR [descrição detalhada do bem], pelo valor total de R$ {{ valor_causa }}.</p>

<h3>CLÁUSULA SEGUNDA - DO PREÇO E FORMA DE PAGAMENTO</h3>
<p>O preço será pago da seguinte forma:<br>
a) Sinal: R$ [___] na assinatura deste contrato;<br>
b) Saldo: R$ [___] em [data ou condições].</p>

<h3>CLÁUSULA TERCEIRA - DA TRADIÇÃO</h3>
<p>A entrega do bem será realizada em [data/condições].</p>

<h3>CLÁUSULA QUARTA - DAS GARANTIAS</h3>
<p>O VENDEDOR garante que o bem está livre de ônus e gravames.</p>

<h3>CLÁUSULA QUINTA - DAS MULTAS</h3>
<p>O descumprimento de qualquer cláusula sujeitará a parte infratora a multa de 10% sobre o valor total.</p>

<h3>CLÁUSULA SEXTA - DO FORO</h3>
<p>Fica eleito o foro da comarca de ___.</p>

<p>Local e data.</p>

<p>_______________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_______________________________<br>
{{ cliente_nome }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ reu_nome }}<br>
VENDEDOR&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;COMPRADOR</p>`,
        folderId: pastaContratos.id,
      },
      {
        nome: 'Contrato de Prestação de Serviços',
        descricao: 'Modelo genérico de contrato de serviços',
        conteudo: `<h2 style="text-align: center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>

<p><strong>CONTRATANTE:</strong> {{ cliente_nome }}, CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.</p>

<p><strong>CONTRATADO:</strong> {{ reu_nome }}, CPF ___, residente à ___.</p>

<p>Pelo presente instrumento, as partes celebram CONTRATO DE PRESTAÇÃO DE SERVIÇOS:</p>

<h3>CLÁUSULA PRIMEIRA - DO OBJETO</h3>
<p>O CONTRATADO prestará ao CONTRATANTE os seguintes serviços: {{ descricao_processo }}</p>

<h3>CLÁUSULA SEGUNDA - DO PRAZO</h3>
<p>Os serviços serão prestados no prazo de [___] dias/meses, iniciando-se em [data].</p>

<h3>CLÁUSULA TERCEIRA - DO VALOR</h3>
<p>O CONTRATANTE pagará ao CONTRATADO o valor total de R$ {{ valor_causa }}, da seguinte forma: [condições].</p>

<h3>CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATADO</h3>
<p>a) Executar os serviços com zelo e diligência;<br>
b) Fornecer materiais/equipamentos necessários [se aplicável];<br>
c) Cumprir os prazos acordados.</p>

<h3>CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO CONTRATANTE</h3>
<p>a) Fornecer informações necessárias;<br>
b) Efetuar os pagamentos nas datas acordadas;<br>
c) Receber os serviços prestados.</p>

<h3>CLÁUSULA SEXTA - DA RESCISÃO</h3>
<p>O contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia de [__] dias.</p>

<h3>CLÁUSULA SÉTIMA - DO FORO</h3>
<p>Fica eleito o foro da comarca de ___.</p>

<p>Local e data.</p>

<p>_______________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_______________________________<br>
{{ cliente_nome }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ reu_nome }}<br>
CONTRATANTE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CONTRATADO</p>`,
        folderId: pastaContratos.id,
      },

      // DIREITO PREVIDENCIÁRIO
      {
        nome: 'Aposentadoria por Tempo de Contribuição',
        descricao: 'Ação de concessão de benefício previdenciário',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL DA ___ VARA DA SUBSEÇÃO JUDICIÁRIA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE CONCESSÃO DE APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">AÇÃO DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO</h3>

<p>em face do INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>O autor possui [___] anos de tempo de contribuição, conforme CNIS e documentos em anexo.</p>

<p>{{ narrativa_fatos }}</p>

<p>O INSS negou administrativamente o pedido de aposentadoria (NB [número]).</p>

<h3>II - DO DIREITO</h3>

<p>O autor preenche todos os requisitos legais para a concessão da aposentadoria por tempo de contribuição, nos termos da Lei 8.213/91.</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A concessão da aposentadoria por tempo de contribuição;<br>
b) O pagamento das parcelas vencidas desde o requerimento administrativo;<br>
c) A implantação do benefício;<br>
d) Condenação em custas e honorários.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaPrevidenciario.id,
      },
      {
        nome: 'Auxílio-Doença/Aposentadoria por Invalidez',
        descricao: 'Concessão de benefício por incapacidade',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL DA ___ VARA DA SUBSEÇÃO JUDICIÁRIA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE CONCESSÃO DE AUXÍLIO-DOENÇA/APOSENTADORIA POR INVALIDEZ</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">AÇÃO DE CONCESSÃO DE BENEFÍCIO POR INCAPACIDADE</h3>

<p>em face do INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>O autor encontra-se incapacitado para o trabalho desde [data], conforme laudos médicos em anexo.</p>

<p>{{ narrativa_fatos }}</p>

<h3>II - DA INCAPACIDADE</h3>

<p>Perícia médica do INSS reconheceu a incapacidade temporária/permanente.</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A produção de prova pericial;<br>
b) A concessão do auxílio-doença ou aposentadoria por invalidez;<br>
c) O pagamento das parcelas vencidas;<br>
d) A implantação do benefício.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaPrevidenciario.id,
      },

      // RECURSOS ADICIONAIS
      {
        nome: 'Embargos de Declaração',
        descricao: 'Recurso para sanar omissão/contradição',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA ___ DA COMARCA DE ___</strong></p>

<p>Processo nº {{ processo_numero }}</p>

<h2 style="text-align: center;">EMBARGOS DE DECLARAÇÃO</h2>

<p>{{ cliente_nome }}, já qualificado nos autos, vem opor</p>

<h3 style="text-align: center;">EMBARGOS DE DECLARAÇÃO</h3>

<p>em face da r. decisão/sentença proferida às fls. ___, pelos fundamentos a seguir expostos:</p>

<h3>I - DA OMISSÃO/CONTRADIÇÃO/OBSCURIDADE</h3>

<p>A decisão embargada incorreu em [omissão/contradição/obscuridade] quanto a:</p>

<p>{{ narrativa_fatos }}</p>

<h3>II - DO PEDIDO</h3>

<p>Diante do exposto, requer-se o acolhimento dos presentes embargos para que seja sanado o vício apontado.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaRecursos.id,
      },
      {
        nome: 'Recurso Especial',
        descricao: 'Recurso ao STJ',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR MINISTRO PRESIDENTE DO SUPERIOR TRIBUNAL DE JUSTIÇA</strong></p>

<p>Processo nº {{ processo_numero }}</p>

<h2 style="text-align: center;">RECURSO ESPECIAL</h2>

<p>{{ cliente_nome }}, já qualificado nos autos, vem interpor</p>

<h3 style="text-align: center;">RECURSO ESPECIAL</h3>

<p>com fundamento no art. 105, III, da Constituição Federal, em face do v. acórdão proferido pelo Tribunal de Justiça, pelos fundamentos a seguir expostos:</p>

<h3>I - DO CABIMENTO</h3>

<p>O presente recurso é cabível, pois o acórdão recorrido:</p>

<p>a) Contrariou lei federal (art. 105, III, "a", CF);<br>
b) [outros fundamentos]</p>

<h3>II - DO PREQUESTIONAMENTO</h3>

<p>A matéria federal foi devidamente prequestionada nas razões de [apelação/embargos].</p>

<h3>III - DOS FATOS</h3>

<p>{{ narrativa_fatos }}</p>

<h3>IV - DO DIREITO</h3>

<p>O v. acórdão violou [dispositivos legais federais].</p>

<h3>V - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) O recebimento e provimento do recurso;<br>
b) A reforma/anulação do acórdão recorrido.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaRecursos.id,
      },

      // TRABALHISTA ADICIONAL
      {
        nome: 'Ação de Horas Extras',
        descricao: 'Pedido de pagamento de horas extraordinárias',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA ___ VARA DO TRABALHO DE ___</strong></p>

<h2 style="text-align: center;">RECLAMAÇÃO TRABALHISTA - HORAS EXTRAS</h2>

<p><strong>RECLAMANTE:</strong> {{ cliente_nome }}, CPF {{ cliente_cpf }}<br>
<strong>RECLAMADA:</strong> {{ reu_nome }}</p>

<h3 style="text-align: center;">HORAS EXTRAS NÃO PAGAS</h3>

<h3>I - DA RELAÇÃO DE EMPREGO</h3>

<p>O Reclamante laborou para a Reclamada de [data inicial] até [data final], na função de [cargo].</p>

<h3>II - DAS HORAS EXTRAS</h3>

<p>{{ narrativa_fatos }}</p>

<p>O Reclamante laborava habitualmente [___] horas diárias, extrapolando a jornada legal, sem o devido pagamento de horas extras.</p>

<h3>III - DO DIREITO</h3>

<p>As horas extras são devidas nos termos dos arts. 59 e seguintes da CLT, com adicional de no mínimo 50%.</p>

<h3>IV - DOS PEDIDOS</h3>

<p>a) Pagamento de horas extras com adicional de 50%;<br>
b) Reflexos em DSR, férias, 13º salário e FGTS;<br>
c) Multa do art. 477 da CLT;<br>
d) Honorários advocatícios.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaTrabalhistas.id,
      },
      {
        nome: 'Ação de Acidente de Trabalho',
        descricao: 'Indenização por acidente laboral',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA ___ VARA DO TRABALHO DE ___</strong></p>

<h2 style="text-align: center;">RECLAMAÇÃO TRABALHISTA - ACIDENTE DE TRABALHO</h2>

<p><strong>RECLAMANTE:</strong> {{ cliente_nome }}, CPF {{ cliente_cpf }}<br>
<strong>RECLAMADA:</strong> {{ reu_nome }}</p>

<h3 style="text-align: center;">INDENIZAÇÃO POR ACIDENTE DE TRABALHO</h3>

<h3>I - DA RELAÇÃO DE EMPREGO</h3>

<p>O Reclamante laborava para a Reclamada desde [data] na função de [cargo].</p>

<h3>II - DO ACIDENTE DE TRABALHO</h3>

<p>Em [data], o Reclamante sofreu acidente de trabalho:</p>

<p>{{ narrativa_fatos }}</p>

<h3>III - DA CULPA DA RECLAMADA</h3>

<p>A Reclamada não forneceu EPIs adequados nem treinamento, violando normas de segurança do trabalho.</p>

<h3>IV - DOS DANOS</h3>

<p>O acidente causou [lesões/sequelas permanentes], gerando danos materiais, morais e estéticos.</p>

<h3>V - DOS PEDIDOS</h3>

<p>a) Indenização por danos materiais (lucros cessantes): R$ [valor];<br>
b) Indenização por danos morais: R$ {{ valor_causa }};<br>
c) Indenização por danos estéticos: R$ [valor];<br>
d) Pensão vitalícia mensal;<br>
e) Estabilidade acidentária;<br>
f) Honorários advocatícios.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaTrabalhistas.id,
      },

      // CÍVEL ADICIONAL
      {
        nome: 'Ação de Cobrança',
        descricao: 'Cobrança de dívida líquida e certa',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE COBRANÇA</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">AÇÃO DE COBRANÇA</h3>

<p>em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:</p>

<h3>I - DOS FATOS</h3>

<p>Em [data], o réu contraiu dívida com o autor no valor de R$ {{ valor_causa }}, conforme documentos em anexo.</p>

<p>{{ narrativa_fatos }}</p>

<p>O débito encontra-se vencido e não pago, apesar de notificações extrajudiciais.</p>

<h3>II - DO DIREITO</h3>

<p>A dívida é líquida, certa e exigível, nos termos dos arts. 586 e seguintes do CPC.</p>

<h3>III - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A citação do réu para pagamento ou defesa;<br>
b) A condenação ao pagamento de R$ {{ valor_causa }}, corrigido e com juros;<br>
c) Condenação em custas e honorários advocatícios.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Ação de Despejo',
        descricao: 'Retomada de imóvel por falta de pagamento',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">AÇÃO DE DESPEJO C/C COBRANÇA DE ALUGUÉIS</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor</p>

<h3 style="text-align: center;">AÇÃO DE DESPEJO POR FALTA DE PAGAMENTO</h3>

<p>em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:</p>

<h3>I - DA LOCAÇÃO</h3>

<p>O autor é locador do imóvel situado à [endereço], locado ao réu mediante contrato em anexo.</p>

<h3>II - DA INADIMPLÊNCIA</h3>

<p>{{ narrativa_fatos }}</p>

<p>O réu encontra-se inadimplente com os aluguéis vencidos desde [mês/ano], totalizando R$ {{ valor_causa }}.</p>

<h3>III - DO DIREITO</h3>

<p>O despejo é cabível nos termos da Lei 8.245/91, art. 9º, III.</p>

<h3>IV - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A citação do réu para purgação da mora em 15 dias;<br>
b) A decretação do despejo;<br>
c) A condenação ao pagamento dos aluguéis vencidos e vincendos;<br>
d) Multa contratual e honorários.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Mandado de Segurança',
        descricao: 'Proteção de direito líquido e certo',
        conteudo: `<p style="text-align: center;"><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE ___</strong></p>

<h2 style="text-align: center;">MANDADO DE SEGURANÇA</h2>

<p>{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem impetrar</p>

<h3 style="text-align: center;">MANDADO DE SEGURANÇA</h3>

<p>em face do ato do [autoridade coatora], pelos fundamentos a seguir expostos:</p>

<h3>I - DO ATO COATOR</h3>

<p>{{ narrativa_fatos }}</p>

<p>A autoridade impetrada praticou ato ilegal ao [descrever o ato].</p>

<h3>II - DO DIREITO LÍQUIDO E CERTO</h3>

<p>O impetrante possui direito líquido e certo a [descrever direito], violado pelo ato coator.</p>

<h3>III - DA ILEGALIDADE</h3>

<p>O ato é ilegal por violar [dispositivos legais/constitucionais].</p>

<h3>IV - DOS PEDIDOS</h3>

<p>Diante do exposto, requer-se:</p>

<p>a) A concessão de liminar para suspender o ato coator;<br>
b) A notificação da autoridade coatora;<br>
c) A concessão definitiva da segurança;<br>
d) Honorários advocatícios.</p>

<p>Termos em que,<br>Pede deferimento.</p>

<p>Local e data.</p>

<p>{{ advogado_nome }}<br>OAB/{{ advogado_oab }}</p>`,
        folderId: pastaCiveis.id,
      },
      ],
    });

    console.log('✅ Biblioteca de modelos criada (30+ modelos profissionais)');
  } else {
    console.log('✅ Biblioteca de modelos já existe, pulando criação.');
  }

  console.log('\n🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
