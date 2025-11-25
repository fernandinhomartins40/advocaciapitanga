import { prisma, StatusProcesso } from 'database';

export class ProcessoService {
  async getAll(filters: {
    advogadoId?: string;
    clienteId?: string;
    status?: StatusProcesso;
    page?: number;
    limit?: number;
  }) {
    const { advogadoId, clienteId, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (advogadoId) where.advogadoId = advogadoId;
    if (clienteId) where.clienteId = clienteId;
    if (status) where.status = status;

    const [processos, total] = await Promise.all([
      prisma.processo.findMany({
        where,
        include: {
          cliente: {
            include: {
              user: {
                select: {
                  nome: true,
                  email: true,
                }
              }
            }
          },
          advogado: {
            include: {
              user: {
                select: {
                  nome: true,
                }
              }
            }
          },
          _count: {
            select: {
              documentos: true,
              mensagens: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.processo.count({ where })
    ]);

    return { processos, total, page, limit };
  }

  async getById(id: string, userId?: string, userRole?: string) {
    const processo = await prisma.processo.findUnique({
      where: { id },
      include: {
        cliente: {
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                email: true,
              }
            }
          }
        },
        advogado: {
          include: {
            user: {
              select: {
                id: true,
                nome: true,
              }
            }
          }
        },
        documentos: {
          orderBy: { createdAt: 'desc' }
        },
        mensagens: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    // Verificar permissão se for cliente
    if (userRole === 'CLIENTE' && processo.cliente.user.id !== userId) {
      throw new Error('Acesso negado');
    }

    return processo;
  }

  async create(data: {
    numero: string;
    clienteId: string;
    advogadoId: string;
    descricao: string;
    status?: StatusProcesso;
    dataInicio?: Date;
  }) {
    // Verificar se número já existe
    const existing = await prisma.processo.findUnique({
      where: { numero: data.numero }
    });

    if (existing) {
      throw new Error('Número de processo já cadastrado');
    }

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId }
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    // Verificar se advogado existe
    const advogado = await prisma.advogado.findUnique({
      where: { id: data.advogadoId }
    });

    if (!advogado) {
      throw new Error('Advogado não encontrado');
    }

    const processo = await prisma.processo.create({
      data: {
        numero: data.numero,
        clienteId: data.clienteId,
        advogadoId: data.advogadoId,
        descricao: data.descricao,
        status: data.status || StatusProcesso.EM_ANDAMENTO,
        dataInicio: data.dataInicio || new Date(),
      },
      include: {
        cliente: {
          include: {
            user: {
              select: {
                nome: true,
              }
            }
          }
        },
        advogado: {
          include: {
            user: {
              select: {
                nome: true,
              }
            }
          }
        }
      }
    });

    return processo;
  }

  async update(id: string, data: {
    descricao?: string;
    status?: StatusProcesso;
  }) {
    const processo = await prisma.processo.findUnique({
      where: { id }
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    const updated = await prisma.processo.update({
      where: { id },
      data: {
        descricao: data.descricao,
        status: data.status,
      },
      include: {
        cliente: {
          include: {
            user: {
              select: {
                nome: true,
              }
            }
          }
        },
        advogado: {
          include: {
            user: {
              select: {
                nome: true,
              }
            }
          }
        }
      }
    });

    return updated;
  }

  async delete(id: string) {
    const processo = await prisma.processo.findUnique({
      where: { id }
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    await prisma.processo.delete({
      where: { id }
    });

    return { message: 'Processo excluído com sucesso' };
  }

  async getDashboardStats(advogadoId: string) {
    const [
      totalClientes,
      totalProcessos,
      processosEmAndamento,
      processosConcluidos,
      mensagensNaoLidas
    ] = await Promise.all([
      prisma.processo.groupBy({
        by: ['clienteId'],
        where: { advogadoId },
      }).then(result => result.length), // Conta clientes únicos do advogado
      prisma.processo.count({ where: { advogadoId } }),
      prisma.processo.count({
        where: {
          advogadoId,
          status: StatusProcesso.EM_ANDAMENTO
        }
      }),
      prisma.processo.count({
        where: {
          advogadoId,
          status: StatusProcesso.CONCLUIDO,
          updatedAt: {
            gte: new Date(new Date().setDate(1)) // Primeiro dia do mês
          }
        }
      }),
      prisma.mensagem.count({
        where: {
          processo: {
            advogadoId
          },
          remetente: 'Cliente',
          lida: false
        }
      })
    ]);

    // Processos por status
    const processosPorStatus = await prisma.processo.groupBy({
      by: ['status'],
      where: { advogadoId },
      _count: true
    });

    return {
      totalClientes,
      totalProcessos,
      processosEmAndamento,
      processosConcluidos,
      mensagensNaoLidas,
      processosPorStatus: processosPorStatus.map(p => ({
        status: p.status,
        count: p._count
      }))
    };
  }
}
