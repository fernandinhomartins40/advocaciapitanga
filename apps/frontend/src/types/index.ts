export interface User {
  id: string;
  email: string;
  nome: string;
  role: 'ADVOGADO' | 'CLIENTE';
  createdAt: string;
  cliente?: Cliente;
  advogado?: Advogado;
}

export interface Cliente {
  id: string;
  cpf: string;
  telefone?: string;
  endereco?: string;
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
  user: {
    id: string;
    email: string;
    nome: string;
  };
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
