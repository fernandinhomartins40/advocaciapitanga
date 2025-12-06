import { prisma } from 'database';
import { hashPassword } from '../utils/bcrypt';

export class EscritorioService {
  /**
   * Criar escritório para um advogado (ao se cadastrar)
   */
  async criarEscritorio(data: {
    nome: string;
    cnpj?: string;
    advogadoId: string;
  }) {
    const escritorio = await prisma.escritorio.create({
      data: {
        nome: data.nome,
        cnpj: data.cnpj,
        adminId: data.advogadoId,
      },
      include: {
        admin: {
          include: {
            user: true,
          },
        },
      },
    });

    // Atualizar advogado com escritório
    await prisma.advogado.update({
      where: { id: data.advogadoId },
      data: { escritorioId: escritorio.id },
    });

    return escritorio;
  }

  /**
   * Obter escritório do usuário (admin ou membro)
   */
  async obterEscritorio(userId: string) {
    // Verificar se é admin
    const advogado = await prisma.advogado.findUnique({
      where: { userId },
      include: {
        escritoriosAdmin: {
          include: {
            membros: {
              where: { ativo: true },
              include: {
                user: {
                  select: {
                    id: true,
                    nome: true,
                    email: true,
                    role: true,
                    ativo: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (advogado && advogado.escritoriosAdmin.length > 0) {
      return advogado.escritoriosAdmin[0];
    }

    // Verificar se é membro
    const membro = await prisma.membroEscritorio.findUnique({
      where: { userId },
      include: {
        escritorio: {
          include: {
            admin: {
              include: {
                user: true,
              },
            },
            membros: {
              where: { ativo: true },
              include: {
                user: {
                  select: {
                    id: true,
                    nome: true,
                    email: true,
                    role: true,
                    ativo: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (membro) {
      return membro.escritorio;
    }

    return null;
  }

  /**
   * Atualizar dados do escritório (apenas admin)
   */
  async atualizarEscritorio(
    escritorioId: string,
    data: {
      nome?: string;
      cnpj?: string;
    }
  ) {
    return prisma.escritorio.update({
      where: { id: escritorioId },
      data,
    });
  }

  /**
   * Listar membros do escritório
   */
  async listarMembros(escritorioId: string) {
    return prisma.membroEscritorio.findMany({
      where: { escritorioId },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
            ativo: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Adicionar novo membro ao escritório
   */
  async adicionarMembro(data: {
    escritorioId: string;
    nome: string;
    email: string;
    role: 'ADVOGADO' | 'ASSISTENTE' | 'ESTAGIARIO';
    oab?: string;
    telefone?: string;
    permissoes?: {
      gerenciarUsuarios?: boolean;
      gerenciarTodosProcessos?: boolean;
      gerenciarProcessosProprios?: boolean;
      visualizarOutrosProcessos?: boolean;
      gerenciarClientes?: boolean;
      visualizarClientes?: boolean;
      gerenciarIA?: boolean;
      configurarSistema?: boolean;
      visualizarRelatorios?: boolean;
      exportarDados?: boolean;
    };
    convidadoPor: string;
    password?: string;
  }) {
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email já cadastrado no sistema');
    }

    // Verificar OAB se for advogado
    if (data.role === 'ADVOGADO' && data.oab) {
      const existingOAB = await prisma.advogado.findUnique({
        where: { oab: data.oab },
      });

      if (existingOAB) {
        throw new Error('OAB já cadastrada');
      }
    }

    // Usar senha informada ou gerar temporária
    const senhaEmUso = data.password && data.password.length > 0 ? data.password : this.gerarSenhaTemporaria();
    const hashedPassword = await hashPassword(senhaEmUso);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nome: data.nome,
        role: data.role,
        ...(data.role === 'ADVOGADO' && data.oab
          ? {
              advogado: {
                create: {
                  oab: data.oab,
                  telefone: data.telefone,
                  escritorioId: data.escritorioId,
                },
              },
            }
          : {}),
      },
      include: {
        advogado: true,
      },
    });

    // Aplicar permissões padrão baseadas no role
    const permissoesPadrao = this.obterPermissoesPadrao(data.role);
    const permissoesFinais = {
      ...permissoesPadrao,
      ...(data.permissoes || {}),
    };

    // Criar membro do escritório
    const membro = await prisma.membroEscritorio.create({
      data: {
        escritorioId: data.escritorioId,
        userId: user.id,
        convidadoPor: data.convidadoPor,
        ...permissoesFinais,
      },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
            ativo: true,
          },
        },
      },
    });

    // TODO: Enviar email com senha temporária
    // await this.enviarEmailConvite(data.email, data.nome, senhaTemporaria);

    return {
      membro,
      senhaTemporaria: data.password ? undefined : senhaEmUso, // Apenas retorna temporária quando gerada
    };
  }

  /**
   * Atualizar permissões de um membro
   */
  async atualizarPermissoes(
    membroId: string,
    permissoes: {
      gerenciarUsuarios?: boolean;
      gerenciarTodosProcessos?: boolean;
      gerenciarProcessosProprios?: boolean;
      visualizarOutrosProcessos?: boolean;
      gerenciarClientes?: boolean;
      visualizarClientes?: boolean;
      gerenciarIA?: boolean;
      configurarSistema?: boolean;
      visualizarRelatorios?: boolean;
      exportarDados?: boolean;
    }
  ) {
    return prisma.membroEscritorio.update({
      where: { id: membroId },
      data: permissoes,
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Desativar membro
   */
  async desativarMembro(membroId: string) {
    const membro = await prisma.membroEscritorio.update({
      where: { id: membroId },
      data: { ativo: false },
    });

    // Desativar usuário também
    await prisma.user.update({
      where: { id: membro.userId },
      data: { ativo: false },
    });

    return membro;
  }

  /**
   * Reativar membro
   */
  async reativarMembro(membroId: string) {
    const membro = await prisma.membroEscritorio.update({
      where: { id: membroId },
      data: { ativo: true },
    });

    // Reativar usuário também
    await prisma.user.update({
      where: { id: membro.userId },
      data: { ativo: true },
    });

    return membro;
  }

  /**
   * Remover membro do escritório (exclusão permanente)
   */
  async removerMembro(membroId: string) {
    const membro = await prisma.membroEscritorio.findUnique({
      where: { id: membroId },
    });

    if (!membro) {
      throw new Error('Membro não encontrado');
    }

    // Remover membro
    await prisma.membroEscritorio.delete({
      where: { id: membroId },
    });

    // Remover usuário (cascade irá limpar relacionamentos)
    await prisma.user.delete({
      where: { id: membro.userId },
    });

    return { message: 'Membro removido com sucesso' };
  }

  /**
   * Obter permissões padrão por role
   */
  private obterPermissoesPadrao(role: string) {
    switch (role) {
      case 'ADVOGADO':
        return {
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
        };
      case 'ASSISTENTE':
        return {
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
        };
      case 'ESTAGIARIO':
        return {
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
        };
      default:
        throw new Error('Role inválido');
    }
  }

  /**
   * Gerar senha temporária aleatória
   */
  private gerarSenhaTemporaria(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let senha = '';
    for (let i = 0; i < 12; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  }
}
