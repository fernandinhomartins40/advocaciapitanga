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
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

PETIÇÃO INICIAL - AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS

{{ cliente_nome }}, nacionalidade, estado civil, profissão, portador do CPF {{ cliente_cpf }}, residente e domiciliado à {{ cliente_endereco }}, por intermédio de seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor

AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS

em face de {{ reu_nome }}, pelos fatos e fundamentos jurídicos a seguir expostos:

I - DOS FATOS

{{ narrativa_fatos }}

II - DO DIREITO

O dano moral configura-se pela violação dos direitos da personalidade, conforme previsto nos artigos 186 e 927 do Código Civil.

No caso em tela, restou evidenciado o dano moral sofrido pelo autor, uma vez que {{ descricao_processo }}.

III - DO PEDIDO

Diante do exposto, requer-se:

a) A citação do réu para, querendo, contestar a presente ação, sob pena de revelia e confissão;

b) A condenação do réu ao pagamento de indenização por danos morais no valor de R$ {{ valor_causa }};

c) A condenação do réu ao pagamento de custas processuais e honorários advocatícios;

d) A produção de todos os meios de prova em direito admitidos.

Dá-se à causa o valor de R$ {{ valor_causa }}.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Contestação - Responsabilidade Civil',
        descricao: 'Modelo de contestação com preliminares e mérito',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

Processo nº {{ processo_numero }}

CONTESTAÇÃO

{{ cliente_nome }}, já qualificado nos autos da ação em epígrafe que lhe move {{ reu_nome }}, vem, por intermédio de seu advogado, apresentar

CONTESTAÇÃO

pelos fundamentos de fato e de direito a seguir aduzidos:

I - PRELIMINARMENTE

[Inserir preliminares se aplicável - ilegitimidade, incompetência, etc.]

II - DO MÉRITO

Os fatos narrados na inicial não correspondem à verdade, senão vejamos:

{{ narrativa_fatos }}

A pretensão autoral carece de fundamento jurídico, uma vez que:

1) Não houve comprovação do alegado dano;
2) Inexiste nexo de causalidade entre a conduta e o suposto dano;
3) O valor pleiteado é exorbitante e não encontra amparo legal.

III - DO PEDIDO

Diante do exposto, requer-se:

a) O acolhimento das preliminares arguidas, com extinção do processo sem resolução de mérito;

b) Subsidiariamente, a improcedência total dos pedidos autorais;

c) A condenação do autor ao pagamento de custas processuais e honorários advocatícios.

Protesta provar o alegado por todos os meios de prova em direito admitidos.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Procuração ad judicia',
        descricao: 'Procuração padrão para representação em juízo',
        conteudo: `PROCURAÇÃO

OUTORGANTE: {{ cliente_nome }}, nacionalidade, estado civil, profissão, portador do CPF {{ cliente_cpf }}, residente e domiciliado à {{ cliente_endereco }}.

OUTORGADO: {{ advogado_nome }}, advogado, inscrito na OAB/{{ advogado_oab }}.

PODERES: Pelo presente instrumento particular de procuração, o OUTORGANTE nomeia e constitui seu bastante procurador o OUTORGADO, a quem confere amplos e gerais poderes para o foro em geral, com a cláusula "ad judicia", podendo propor, em nome do outorgante, as ações que julgar convenientes, acompanhá-las e receber citações e intimações, confessar, transigir, desistir, firmar compromissos ou acordos, receber e dar quitação, podendo ainda substabelecer esta em outrem, com ou sem reserva de iguais poderes.

Local e data.

_______________________________
{{ cliente_nome }}
CPF: {{ cliente_cpf }}`,
        folderId: pastaModelos.id,
      },
      {
        nome: 'Reclamação Trabalhista',
        descricao: 'Modelo de reclamação trabalhista com verbas rescisórias',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA ___ VARA DO TRABALHO DE ___

RECLAMAÇÃO TRABALHISTA

RECLAMANTE: {{ cliente_nome }}
CPF: {{ cliente_cpf }}
Endereço: {{ cliente_endereco }}

RECLAMADA: {{ reu_nome }}

O RECLAMANTE, por intermédio de seu advogado subscritor, vem, respeitosamente, à presença de Vossa Excelência, propor

RECLAMAÇÃO TRABALHISTA

em face da RECLAMADA, pelos fatos e fundamentos a seguir expostos:

I - DA RELAÇÃO DE EMPREGO

O Reclamante foi admitido em [data de admissão], exercendo a função de [cargo], mediante remuneração mensal de R$ [salário].

O vínculo empregatício perdurou até [data de demissão], quando foi dispensado sem justa causa.

II - DA NARRATIVA DOS FATOS

{{ narrativa_fatos }}

III - DO DIREITO

A Reclamada deixou de pagar as seguintes verbas rescisórias:

a) Aviso prévio indenizado (Art. 487, CLT);
b) Férias vencidas e proporcionais acrescidas de 1/3 constitucional (Art. 146, CLT);
c) 13º salário proporcional (Lei 4.090/62);
d) Saldo de salário;
e) FGTS com multa de 40% (Art. 18, §1º, Lei 8.036/90);
f) Multa do Art. 477, §8º da CLT.

IV - DOS PEDIDOS

Diante do exposto, requer-se:

a) A citação da Reclamada;

b) A condenação ao pagamento das verbas acima discriminadas;

c) A condenação em custas processuais e honorários advocatícios;

d) A produção de todos os meios de prova em direito admitidos.

Dá-se à causa o valor de R$ {{ valor_causa }}.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaTrabalhistas.id,
      },
      {
        nome: 'Contrato de Prestação de Serviços Advocatícios',
        descricao: 'Contrato para formalizar honorários advocatícios',
        conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: {{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.

CONTRATADO: {{ advogado_nome }}, advogado inscrito na OAB/{{ advogado_oab }}.

As partes acima qualificadas celebram o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS, mediante as seguintes cláusulas e condições:

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios pelo CONTRATADO ao CONTRATANTE, referente a: {{ descricao_processo }}

CLÁUSULA SEGUNDA - DOS HONORÁRIOS
Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO honorários no valor de {{ honorarios }}, a ser pago da seguinte forma: [condições de pagamento].

CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO CONTRATADO
O CONTRATADO obriga-se a:
a) Prestar os serviços advocatícios com zelo e diligência;
b) Manter o CONTRATANTE informado sobre o andamento do processo;
c) Guardar sigilo sobre todas as informações recebidas.

CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATANTE
O CONTRATANTE obriga-se a:
a) Fornecer todas as informações e documentos necessários;
b) Efetuar o pagamento dos honorários na forma acordada;
c) Arcar com custas processuais e despesas correlatas.

CLÁUSULA QUINTA - DO FORO
Fica eleito o foro da comarca de ___ para dirimir quaisquer questões oriundas deste contrato.

E, por estarem assim justos e contratados, firmam o presente instrumento em duas vias de igual teor.

Local e data.

_______________________________        _______________________________
{{ cliente_nome }}                    {{ advogado_nome }}
CONTRATANTE                           OAB/{{ advogado_oab }}`,
        folderId: pastaModelos.id,
      },
      {
        nome: 'Recurso de Apelação',
        descricao: 'Modelo de recurso de apelação cível',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR RELATOR DO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___

Processo nº {{ processo_numero }}

RECURSO DE APELAÇÃO

{{ cliente_nome }}, já qualificado nos autos do processo em epígrafe, inconformado com a r. sentença proferida às fls. ___, que [resultado da sentença], vem, por intermédio de seu advogado, interpor

RECURSO DE APELAÇÃO

com fundamento no artigo 1.009 do Código de Processo Civil, pelas razões de fato e de direito a seguir aduzidas:

I - DA TEMPESTIVIDADE

O presente recurso é tempestivo, conforme se verifica pela publicação da sentença em [data].

II - DO CABIMENTO

O recurso de apelação é o meio adequado para impugnar a sentença que [fundamentação].

III - DOS FATOS

{{ narrativa_fatos }}

IV - DO DIREITO

A r. sentença recorrida merece reforma pelos seguintes fundamentos:

1) [Primeiro fundamento];
2) [Segundo fundamento];
3) [Terceiro fundamento].

V - DOS PEDIDOS

Diante do exposto, requer-se:

a) O recebimento do presente recurso;

b) A reforma da sentença recorrida para [pedido específico];

c) A condenação do apelado em custas processuais e honorários advocatícios.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Agravo de Instrumento',
        descricao: 'Modelo de agravo de instrumento',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR RELATOR DO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___

Processo nº {{ processo_numero }}

AGRAVO DE INSTRUMENTO

{{ cliente_nome }}, já qualificado nos autos do processo originário em epígrafe, vem, por intermédio de seu advogado subscritor, interpor

AGRAVO DE INSTRUMENTO

com fulcro no artigo 1.015 do Código de Processo Civil, em face da r. decisão interlocutória proferida às fls. ___, pelos fundamentos a seguir expostos:

I - DA TEMPESTIVIDADE E CABIMENTO

O presente recurso é tempestivo e cabível, nos termos do art. 1.015 do CPC.

II - DA DECISÃO AGRAVADA

A decisão agravada determinou [descrição da decisão], causando grave prejuízo ao agravante.

III - DOS FATOS

{{ narrativa_fatos }}

IV - DO DIREITO

A decisão merece reforma pelos seguintes fundamentos:

[Fundamentação jurídica detalhada]

V - DO PEDIDO LIMINAR

Requer-se a concessão de efeito suspensivo/ativo ao presente agravo.

VI - DOS PEDIDOS FINAIS

Diante do exposto, requer-se:

a) A concessão de efeito suspensivo;
b) O provimento do recurso para reformar a decisão agravada;
c) A intimação do agravado para contrarrazões.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaRecursos.id,
      },

      // DIREITO DE FAMÍLIA E SUCESSÕES
      {
        nome: 'Ação de Divórcio Consensual',
        descricao: 'Modelo de divórcio com acordo entre as partes',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA DE FAMÍLIA E SUCESSÕES DA COMARCA DE ___

AÇÃO DE DIVÓRCIO CONSENSUAL

{{ cliente_nome }}, nacionalidade, estado civil, profissão, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, e {{ reu_nome }}, já qualificado nos autos, vêm, por seus advogados, requerer

DIVÓRCIO CONSENSUAL

com fundamento no art. 731 do CPC, pelos fundamentos de fato e de direito a seguir expostos:

I - DO CASAMENTO

Os requerentes contraíram matrimônio em [data], conforme certidão em anexo.

II - DA INEXISTÊNCIA DE BENS A PARTILHAR

Declaram os requerentes que não possuem bens a partilhar, conforme declaração em anexo.

III - DOS FILHOS

[Não há filhos menores ou incapazes] OU [Há filhos menores, conforme acordo de guarda e alimentos em anexo]

IV - DOS PEDIDOS

Diante do exposto, requerem:

a) A decretação do divórcio consensual;
b) A expedição de mandado para averbação junto ao Cartório competente.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaFamilia.id,
      },
      {
        nome: 'Ação de Alimentos',
        descricao: 'Pedido de pensão alimentícia',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA DE FAMÍLIA DA COMARCA DE ___

AÇÃO DE ALIMENTOS

{{ cliente_nome }}, menor impúbere, representado por sua genitora [nome da mãe], vem, por intermédio de seu advogado, propor

AÇÃO DE ALIMENTOS

em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:

I - DOS FATOS

O requerido é genitor do autor, conforme certidão de nascimento em anexo.

{{ narrativa_fatos }}

II - DO DIREITO

O dever de prestar alimentos decorre do poder familiar, nos termos dos artigos 1.694 e seguintes do Código Civil.

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) A fixação de alimentos provisórios no percentual de 30% dos rendimentos líquidos do requerido;
b) A citação do requerido;
c) A condenação definitiva ao pagamento de alimentos no valor de R$ {{ valor_causa }} ou percentual sobre os rendimentos.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaFamilia.id,
      },
      {
        nome: 'Inventário e Partilha',
        descricao: 'Abertura de inventário judicial',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA DE FAMÍLIA E SUCESSÕES DA COMARCA DE ___

INVENTÁRIO E PARTILHA

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, na qualidade de herdeiro de [nome do falecido], vem requerer

ABERTURA DE INVENTÁRIO E PARTILHA

pelos fundamentos a seguir expostos:

I - DO FALECIMENTO

O(a) falecido(a) [nome] veio a falecer em [data], conforme certidão de óbito em anexo.

II - DOS HERDEIROS

São herdeiros do falecido:
- {{ cliente_nome }}, CPF {{ cliente_cpf }}
- [Demais herdeiros]

III - DOS BENS

O espólio é composto pelos seguintes bens:
{{ narrativa_fatos }}

IV - DOS PEDIDOS

Diante do exposto, requer-se:

a) A abertura do inventário;
b) A nomeação do requerente como inventariante;
c) A citação dos herdeiros e interessados;
d) A avaliação e partilha dos bens.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaFamilia.id,
      },

      // DIREITO DO CONSUMIDOR
      {
        nome: 'Reclamação - Defeito no Produto',
        descricao: 'Ação de reparação por vício do produto',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE ___

RECLAMAÇÃO - DEFEITO NO PRODUTO

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

RECLAMAÇÃO

em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:

I - DOS FATOS

Em [data], o reclamante adquiriu [produto], no valor de R$ {{ valor_causa }}.

{{ narrativa_fatos }}

O produto apresentou defeito dentro do prazo de garantia, e a reclamada se recusou a reparar ou substituir o bem.

II - DO DIREITO

O Código de Defesa do Consumidor (Lei 8.078/90) garante ao consumidor o direito à reparação por vício do produto (arts. 18 e seguintes).

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) A condenação da reclamada à restituição do valor pago (R$ {{ valor_causa }});
b) Indenização por danos morais no valor de R$ [valor];
c) Inversão do ônus da prova.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaConsumidor.id,
      },
      {
        nome: 'Ação contra Plano de Saúde',
        descricao: 'Obrigação de fazer - cobertura de procedimento',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

AÇÃO DE OBRIGAÇÃO DE FAZER C/C INDENIZAÇÃO POR DANOS MORAIS

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

AÇÃO DE OBRIGAÇÃO DE FAZER

em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:

I - DOS FATOS

O autor é beneficiário do plano de saúde operado pela ré, mediante pagamento regular de mensalidades.

{{ narrativa_fatos }}

A ré negou indevidamente cobertura para [procedimento], violando o contrato e a legislação consumerista.

II - DO DIREITO

A recusa é abusiva e viola o CDC (art. 51, IV) e a Lei 9.656/98.

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) TUTELA DE URGÊNCIA para determinar a imediata cobertura do procedimento;
b) A condenação da ré à obrigação de fazer (autorizar o procedimento);
c) Indenização por danos morais no valor de R$ {{ valor_causa }};
d) Condenação em custas e honorários.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaConsumidor.id,
      },
      {
        nome: 'Revisão de Contrato Bancário',
        descricao: 'Ação revisional de cláusulas abusivas',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

AÇÃO REVISIONAL DE CONTRATO BANCÁRIO

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

AÇÃO REVISIONAL DE CONTRATO

em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:

I - DOS FATOS

O autor celebrou contrato de [tipo de contrato] com a ré em [data].

{{ narrativa_fatos }}

O contrato contém cláusulas abusivas: juros exorbitantes, capitalização irregular, tarifas indevidas.

II - DO DIREITO

As cláusulas violam o CDC (arts. 39, 51) e legislação bancária.

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) A revisão das cláusulas contratuais abusivas;
b) A limitação dos juros aos índices legais;
c) A restituição em dobro dos valores cobrados indevidamente;
d) A consignação em pagamento dos valores corretos;
e) Condenação em custas e honorários.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaConsumidor.id,
      },

      // CONTRATOS
      {
        nome: 'Contrato de Locação Residencial',
        descricao: 'Modelo de contrato de aluguel residencial',
        conteudo: `CONTRATO DE LOCAÇÃO RESIDENCIAL

LOCADOR: {{ cliente_nome }}, CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.

LOCATÁRIO: {{ reu_nome }}, CPF ___, residente à ___.

Pelo presente instrumento, as partes acima qualificadas celebram CONTRATO DE LOCAÇÃO:

CLÁUSULA PRIMEIRA - DO OBJETO
O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado à [endereço completo], para fins exclusivamente residenciais.

CLÁUSULA SEGUNDA - DO PRAZO
O prazo de locação é de [___] meses, iniciando-se em [data] e findando em [data].

CLÁUSULA TERCEIRA - DO VALOR E FORMA DE PAGAMENTO
O valor mensal do aluguel é de R$ {{ valor_causa }}, a ser pago até o dia [__] de cada mês.

CLÁUSULA QUARTA - DO REAJUSTE
O aluguel será reajustado anualmente pelo IGP-M ou índice que vier a substituí-lo.

CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO LOCATÁRIO
a) Pagar pontualmente o aluguel e encargos;
b) Conservar o imóvel em bom estado;
c) Restituir o imóvel nas mesmas condições.

CLÁUSULA SEXTA - DAS MULTAS
O atraso no pagamento sujeitará o locatário a multa de 10% sobre o valor.

CLÁUSULA SÉTIMA - DO FORO
Fica eleito o foro da comarca de ___.

Local e data.

_______________________________        _______________________________
{{ cliente_nome }}                    {{ reu_nome }}
LOCADOR                               LOCATÁRIO`,
        folderId: pastaContratos.id,
      },
      {
        nome: 'Contrato de Compra e Venda',
        descricao: 'Modelo de contrato de compra e venda de bem móvel',
        conteudo: `CONTRATO DE COMPRA E VENDA

VENDEDOR: {{ cliente_nome }}, CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.

COMPRADOR: {{ reu_nome }}, CPF ___, residente à ___.

Pelo presente instrumento, as partes celebram CONTRATO DE COMPRA E VENDA:

CLÁUSULA PRIMEIRA - DO OBJETO
O VENDEDOR vende ao COMPRADOR [descrição detalhada do bem], pelo valor total de R$ {{ valor_causa }}.

CLÁUSULA SEGUNDA - DO PREÇO E FORMA DE PAGAMENTO
O preço será pago da seguinte forma:
a) Sinal: R$ [___] na assinatura deste contrato;
b) Saldo: R$ [___] em [data ou condições].

CLÁUSULA TERCEIRA - DA TRADIÇÃO
A entrega do bem será realizada em [data/condições].

CLÁUSULA QUARTA - DAS GARANTIAS
O VENDEDOR garante que o bem está livre de ônus e gravames.

CLÁUSULA QUINTA - DAS MULTAS
O descumprimento de qualquer cláusula sujeitará a parte infratora a multa de 10% sobre o valor total.

CLÁUSULA SEXTA - DO FORO
Fica eleito o foro da comarca de ___.

Local e data.

_______________________________        _______________________________
{{ cliente_nome }}                    {{ reu_nome }}
VENDEDOR                              COMPRADOR`,
        folderId: pastaContratos.id,
      },
      {
        nome: 'Contrato de Prestação de Serviços',
        descricao: 'Modelo genérico de contrato de serviços',
        conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{ cliente_nome }}, CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}.

CONTRATADO: {{ reu_nome }}, CPF ___, residente à ___.

Pelo presente instrumento, as partes celebram CONTRATO DE PRESTAÇÃO DE SERVIÇOS:

CLÁUSULA PRIMEIRA - DO OBJETO
O CONTRATADO prestará ao CONTRATANTE os seguintes serviços: {{ descricao_processo }}

CLÁUSULA SEGUNDA - DO PRAZO
Os serviços serão prestados no prazo de [___] dias/meses, iniciando-se em [data].

CLÁUSULA TERCEIRA - DO VALOR
O CONTRATANTE pagará ao CONTRATADO o valor total de R$ {{ valor_causa }}, da seguinte forma: [condições].

CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATADO
a) Executar os serviços com zelo e diligência;
b) Fornecer materiais/equipamentos necessários [se aplicável];
c) Cumprir os prazos acordados.

CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO CONTRATANTE
a) Fornecer informações necessárias;
b) Efetuar os pagamentos nas datas acordadas;
c) Receber os serviços prestados.

CLÁUSULA SEXTA - DA RESCISÃO
O contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia de [__] dias.

CLÁUSULA SÉTIMA - DO FORO
Fica eleito o foro da comarca de ___.

Local e data.

_______________________________        _______________________________
{{ cliente_nome }}                    {{ reu_nome }}
CONTRATANTE                           CONTRATADO`,
        folderId: pastaContratos.id,
      },

      // DIREITO PREVIDENCIÁRIO
      {
        nome: 'Aposentadoria por Tempo de Contribuição',
        descricao: 'Ação de concessão de benefício previdenciário',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL DA ___ VARA DA SUBSEÇÃO JUDICIÁRIA DE ___

AÇÃO DE CONCESSÃO DE APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

AÇÃO DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO

em face do INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS, pelos fundamentos a seguir expostos:

I - DOS FATOS

O autor possui [___] anos de tempo de contribuição, conforme CNIS e documentos em anexo.

{{ narrativa_fatos }}

O INSS negou administrativamente o pedido de aposentadoria (NB [número]).

II - DO DIREITO

O autor preenche todos os requisitos legais para a concessão da aposentadoria por tempo de contribuição, nos termos da Lei 8.213/91.

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) A concessão da aposentadoria por tempo de contribuição;
b) O pagamento das parcelas vencidas desde o requerimento administrativo;
c) A implantação do benefício;
d) Condenação em custas e honorários.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaPrevidenciario.id,
      },
      {
        nome: 'Auxílio-Doença/Aposentadoria por Invalidez',
        descricao: 'Concessão de benefício por incapacidade',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL DA ___ VARA DA SUBSEÇÃO JUDICIÁRIA DE ___

AÇÃO DE CONCESSÃO DE AUXÍLIO-DOENÇA/APOSENTADORIA POR INVALIDEZ

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

AÇÃO DE CONCESSÃO DE BENEFÍCIO POR INCAPACIDADE

em face do INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS, pelos fundamentos a seguir expostos:

I - DOS FATOS

O autor encontra-se incapacitado para o trabalho desde [data], conforme laudos médicos em anexo.

{{ narrativa_fatos }}

II - DA INCAPACIDADE

Perícia médica do INSS reconheceu a incapacidade temporária/permanente.

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) A produção de prova pericial;
b) A concessão do auxílio-doença ou aposentadoria por invalidez;
c) O pagamento das parcelas vencidas;
d) A implantação do benefício.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaPrevidenciario.id,
      },

      // RECURSOS ADICIONAIS
      {
        nome: 'Embargos de Declaração',
        descricao: 'Recurso para sanar omissão/contradição',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA ___ DA COMARCA DE ___

Processo nº {{ processo_numero }}

EMBARGOS DE DECLARAÇÃO

{{ cliente_nome }}, já qualificado nos autos, vem opor

EMBARGOS DE DECLARAÇÃO

em face da r. decisão/sentença proferida às fls. ___, pelos fundamentos a seguir expostos:

I - DA OMISSÃO/CONTRADIÇÃO/OBSCURIDADE

A decisão embargada incorreu em [omissão/contradição/obscuridade] quanto a:

{{ narrativa_fatos }}

II - DO PEDIDO

Diante do exposto, requer-se o acolhimento dos presentes embargos para que seja sanado o vício apontado.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaRecursos.id,
      },
      {
        nome: 'Recurso Especial',
        descricao: 'Recurso ao STJ',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR MINISTRO PRESIDENTE DO SUPERIOR TRIBUNAL DE JUSTIÇA

Processo nº {{ processo_numero }}

RECURSO ESPECIAL

{{ cliente_nome }}, já qualificado nos autos, vem interpor

RECURSO ESPECIAL

com fundamento no art. 105, III, da Constituição Federal, em face do v. acórdão proferido pelo Tribunal de Justiça, pelos fundamentos a seguir expostos:

I - DO CABIMENTO

O presente recurso é cabível, pois o acórdão recorrido:

a) Contrariou lei federal (art. 105, III, "a", CF);
b) [outros fundamentos]

II - DO PREQUESTIONAMENTO

A matéria federal foi devidamente prequestionada nas razões de [apelação/embargos].

III - DOS FATOS

{{ narrativa_fatos }}

IV - DO DIREITO

O v. acórdão violou [dispositivos legais federais].

V - DOS PEDIDOS

Diante do exposto, requer-se:

a) O recebimento e provimento do recurso;
b) A reforma/anulação do acórdão recorrido.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaRecursos.id,
      },

      // TRABALHISTA ADICIONAL
      {
        nome: 'Ação de Horas Extras',
        descricao: 'Pedido de pagamento de horas extraordinárias',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA ___ VARA DO TRABALHO DE ___

RECLAMAÇÃO TRABALHISTA - HORAS EXTRAS

RECLAMANTE: {{ cliente_nome }}, CPF {{ cliente_cpf }}
RECLAMADA: {{ reu_nome }}

HORAS EXTRAS NÃO PAGAS

I - DA RELAÇÃO DE EMPREGO

O Reclamante laborou para a Reclamada de [data inicial] até [data final], na função de [cargo].

II - DAS HORAS EXTRAS

{{ narrativa_fatos }}

O Reclamante laborava habitualmente [___] horas diárias, extrapolando a jornada legal, sem o devido pagamento de horas extras.

III - DO DIREITO

As horas extras são devidas nos termos dos arts. 59 e seguintes da CLT, com adicional de no mínimo 50%.

IV - DOS PEDIDOS

a) Pagamento de horas extras com adicional de 50%;
b) Reflexos em DSR, férias, 13º salário e FGTS;
c) Multa do art. 477 da CLT;
d) Honorários advocatícios.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaTrabalhistas.id,
      },
      {
        nome: 'Ação de Acidente de Trabalho',
        descricao: 'Indenização por acidente laboral',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA ___ VARA DO TRABALHO DE ___

RECLAMAÇÃO TRABALHISTA - ACIDENTE DE TRABALHO

RECLAMANTE: {{ cliente_nome }}, CPF {{ cliente_cpf }}
RECLAMADA: {{ reu_nome }}

INDENIZAÇÃO POR ACIDENTE DE TRABALHO

I - DA RELAÇÃO DE EMPREGO

O Reclamante laborava para a Reclamada desde [data] na função de [cargo].

II - DO ACIDENTE DE TRABALHO

Em [data], o Reclamante sofreu acidente de trabalho:

{{ narrativa_fatos }}

III - DA CULPA DA RECLAMADA

A Reclamada não forneceu EPIs adequados nem treinamento, violando normas de segurança do trabalho.

IV - DOS DANOS

O acidente causou [lesões/sequelas permanentes], gerando danos materiais, morais e estéticos.

V - DOS PEDIDOS

a) Indenização por danos materiais (lucros cessantes): R$ [valor];
b) Indenização por danos morais: R$ {{ valor_causa }};
c) Indenização por danos estéticos: R$ [valor];
d) Pensão vitalícia mensal;
e) Estabilidade acidentária;
f) Honorários advocatícios.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaTrabalhistas.id,
      },

      // CÍVEL ADICIONAL
      {
        nome: 'Ação de Cobrança',
        descricao: 'Cobrança de dívida líquida e certa',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

AÇÃO DE COBRANÇA

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

AÇÃO DE COBRANÇA

em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:

I - DOS FATOS

Em [data], o réu contraiu dívida com o autor no valor de R$ {{ valor_causa }}, conforme documentos em anexo.

{{ narrativa_fatos }}

O débito encontra-se vencido e não pago, apesar de notificações extrajudiciais.

II - DO DIREITO

A dívida é líquida, certa e exigível, nos termos dos arts. 586 e seguintes do CPC.

III - DOS PEDIDOS

Diante do exposto, requer-se:

a) A citação do réu para pagamento ou defesa;
b) A condenação ao pagamento de R$ {{ valor_causa }}, corrigido e com juros;
c) Condenação em custas e honorários advocatícios.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Ação de Despejo',
        descricao: 'Retomada de imóvel por falta de pagamento',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ___

AÇÃO DE DESPEJO C/C COBRANÇA DE ALUGUÉIS

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem propor

AÇÃO DE DESPEJO POR FALTA DE PAGAMENTO

em face de {{ reu_nome }}, pelos fundamentos a seguir expostos:

I - DA LOCAÇÃO

O autor é locador do imóvel situado à [endereço], locado ao réu mediante contrato em anexo.

II - DA INADIMPLÊNCIA

{{ narrativa_fatos }}

O réu encontra-se inadimplente com os aluguéis vencidos desde [mês/ano], totalizando R$ {{ valor_causa }}.

III - DO DIREITO

O despejo é cabível nos termos da Lei 8.245/91, art. 9º, III.

IV - DOS PEDIDOS

Diante do exposto, requer-se:

a) A citação do réu para purgação da mora em 15 dias;
b) A decretação do despejo;
c) A condenação ao pagamento dos aluguéis vencidos e vincendos;
d) Multa contratual e honorários.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
        folderId: pastaCiveis.id,
      },
      {
        nome: 'Mandado de Segurança',
        descricao: 'Proteção de direito líquido e certo',
        conteudo: `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE ___

MANDADO DE SEGURANÇA

{{ cliente_nome }}, portador do CPF {{ cliente_cpf }}, residente à {{ cliente_endereco }}, vem impetrar

MANDADO DE SEGURANÇA

em face do ato do [autoridade coatora], pelos fundamentos a seguir expostos:

I - DO ATO COATOR

{{ narrativa_fatos }}

A autoridade impetrada praticou ato ilegal ao [descrever o ato].

II - DO DIREITO LÍQUIDO E CERTO

O impetrante possui direito líquido e certo a [descrever direito], violado pelo ato coator.

III - DA ILEGALIDADE

O ato é ilegal por violar [dispositivos legais/constitucionais].

IV - DOS PEDIDOS

Diante do exposto, requer-se:

a) A concessão de liminar para suspender o ato coator;
b) A notificação da autoridade coatora;
c) A concessão definitiva da segurança;
d) Honorários advocatícios.

Termos em que,
Pede deferimento.

Local e data.

{{ advogado_nome }}
OAB/{{ advogado_oab }}`,
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
