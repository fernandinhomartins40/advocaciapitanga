export interface User {
  id: string;
  email: string;
  nome: string;
  role: 'ADMIN_ESCRITORIO' | 'ADVOGADO' | 'ASSISTENTE' | 'ESTAGIARIO' | 'CLIENTE';
  ativo: boolean;
  createdAt: string;
  cliente?: Cliente;
  advogado?: Advogado;
  membroEscritorio?: MembroEscritorio;
}

export interface Cliente {
  id: string;
  tipoPessoa: 'FISICA' | 'JURIDICA';

  // Pessoa Física
  cpf?: string;
  rg?: string;
  orgaoEmissor?: string;
  nacionalidade?: string;
  estadoCivil?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';
  profissao?: string;
  dataNascimento?: string;

  // Pessoa Jurídica
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  representanteLegal?: string;
  cargoRepresentante?: string;

  // Contato
  telefone?: string;
  celular?: string;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  user: {
    id: string;
    email: string;
    nome: string;
  };
}

export interface Advogado {
  id: string;
  oab: string;
  telefone?: string;
  escritorioId?: string;
  user: {
    id: string;
    email: string;
    nome: string;
  };
}

export interface Escritorio {
  id: string;
  nome: string;
  cnpj?: string;
  adminId: string;
  ativo: boolean;
  createdAt: string;
  admin?: Advogado;
  membros?: MembroEscritorio[];
}

export interface MembroEscritorio {
  id: string;
  escritorioId: string;
  userId: string;
  user?: User;
  escritorio?: Escritorio;

  // Permissões
  gerenciarUsuarios: boolean;
  gerenciarTodosProcessos: boolean;
  gerenciarProcessosProprios: boolean;
  visualizarOutrosProcessos: boolean;
  gerenciarClientes: boolean;
  visualizarClientes: boolean;
  gerenciarIA: boolean;
  configurarSistema: boolean;
  visualizarRelatorios: boolean;
  exportarDados: boolean;

  ativo: boolean;
  dataConvite: string;
  dataAceitacao?: string;
  convidadoPor?: string;
  createdAt: string;
}

export interface Permissoes {
  gerenciarUsuarios: boolean;
  gerenciarTodosProcessos: boolean;
  gerenciarProcessosProprios: boolean;
  visualizarOutrosProcessos: boolean;
  gerenciarClientes: boolean;
  visualizarClientes: boolean;
  gerenciarIA: boolean;
  configurarSistema: boolean;
  visualizarRelatorios: boolean;
  exportarDados: boolean;
}

export const PERFIS_PERMISSOES: Record<string, Partial<Permissoes>> = {
  ADMIN_ESCRITORIO: {
    gerenciarUsuarios: true,
    gerenciarTodosProcessos: true,
    gerenciarProcessosProprios: true,
    visualizarOutrosProcessos: true,
    gerenciarClientes: true,
    visualizarClientes: true,
    gerenciarIA: true,
    configurarSistema: true,
    visualizarRelatorios: true,
    exportarDados: true,
  },
  ADVOGADO: {
    gerenciarUsuarios: false,
    gerenciarTodosProcessos: false,
    gerenciarProcessosProprios: true,
    visualizarOutrosProcessos: true,
    gerenciarClientes: true,
    visualizarClientes: true,
    gerenciarIA: true,
    configurarSistema: false,
    visualizarRelatorios: false,
    exportarDados: false,
  },
  ASSISTENTE: {
    gerenciarUsuarios: false,
    gerenciarTodosProcessos: false,
    gerenciarProcessosProprios: false,
    visualizarOutrosProcessos: true,
    gerenciarClientes: false,
    visualizarClientes: true,
    gerenciarIA: false,
    configurarSistema: false,
    visualizarRelatorios: false,
    exportarDados: false,
  },
  ESTAGIARIO: {
    gerenciarUsuarios: false,
    gerenciarTodosProcessos: false,
    gerenciarProcessosProprios: false,
    visualizarOutrosProcessos: false,
    gerenciarClientes: false,
    visualizarClientes: true,
    gerenciarIA: false,
    configurarSistema: false,
    visualizarRelatorios: false,
    exportarDados: false,
  },
}

export type StatusProcesso = 'EM_ANDAMENTO' | 'SUSPENSO' | 'CONCLUIDO' | 'ARQUIVADO';

export interface Processo {
  id: string;
  numero: string;
  descricao: string;
  status: StatusProcesso;
  dataInicio: string;
  createdAt: string;
  cliente: Cliente & { user: { nome: string; email: string } };
  advogado: Advogado & { user: { nome: string } };
  documentos?: Documento[];
  mensagens?: Mensagem[];
  _count?: {
    documentos: number;
    mensagens: number;
  };
}

export interface Documento {
  id: string;
  titulo: string;
  caminho: string;
  tipo: string;
  tamanho: number;
  processoId: string;
  processo?: {
    numero: string;
  };
  createdAt: string;
}

export interface Mensagem {
  id: string;
  conteudo: string;
  processoId: string;
  processo?: {
    numero: string;
  };
  remetente: 'Advogado' | 'Cliente';
  lida: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalClientes: number;
  totalProcessos: number;
  processosEmAndamento: number;
  processosConcluidos: number;
  mensagensNaoLidas: number;
  processosPorStatus: Array<{
    status: StatusProcesso;
    count: number;
  }>;
}
