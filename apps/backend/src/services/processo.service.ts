import { prisma, StatusProcesso } from 'database';
import { AuditService, AuditAction } from './audit.service';

export class ProcessoService {
  /**
   * Normaliza o número do processo para o formato CNJ
   * NNNNNNN-DD.AAAA.J.TT.OOOO
   */
  private normalizarNumeroProcesso(numero: string): string {
    // Remove tudo exceto dígitos
    const apenasNumeros = numero.replace(/\D/g, '');

    // Se não tiver exatamente 20 dígitos, retorna o número original
    if (apenasNumeros.length !== 20) {
      return numero;
    }

    // Formata: NNNNNNN-DD.AAAA.J.TT.OOOO
    return `${apenasNumeros.slice(0, 7)}-${apenasNumeros.slice(7, 9)}.${apenasNumeros.slice(9, 13)}.${apenasNumeros.slice(13, 14)}.${apenasNumeros.slice(14, 16)}.${apenasNumeros.slice(16, 20)}`;
  }

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
              partes: true,
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
        },
        partes: {
          orderBy: { createdAt: 'asc' }
        },
        documentosProcesso: {
          orderBy: { createdAt: 'desc' },
          include: {
            template: {
              select: {
                id: true,
                nome: true,
              }
            }
          }
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

  async create(data: any) {
    // Normalizar número do processo para formato CNJ
    const numeroNormalizado = this.normalizarNumeroProcesso(data.numero);

    // Verificar se número já existe
    const existing = await prisma.processo.findUnique({
      where: { numero: numeroNormalizado }
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

    // Extrair partes do payload
    const { partes, ...processoData } = data;

    const processo = await prisma.processo.create({
      data: {
        ...processoData,
        numero: numeroNormalizado, // Salvar número normalizado
        status: data.status || StatusProcesso.EM_ANDAMENTO,
        dataInicio: data.dataInicio || new Date(),
        // Criar partes processuais se fornecidas
        partes: partes && partes.length > 0 ? {
          create: partes.map((parte: any) => ({
            tipoParte: parte.tipoParte,
            tipoPessoa: parte.tipoPessoa,
            nomeCompleto: parte.nomeCompleto,
            cpf: parte.cpf,
            rg: parte.rg,
            orgaoEmissor: parte.orgaoEmissor,
            nacionalidade: parte.nacionalidade,
            estadoCivil: parte.estadoCivil,
            profissao: parte.profissao,
            dataNascimento: parte.dataNascimento ? new Date(parte.dataNascimento) : null,
            razaoSocial: parte.razaoSocial,
            nomeFantasia: parte.nomeFantasia,
            cnpj: parte.cnpj,
            inscricaoEstadual: parte.inscricaoEstadual,
            representanteLegal: parte.representanteLegal,
            cargoRepresentante: parte.cargoRepresentante,
            email: parte.email,
            telefone: parte.telefone,
            celular: parte.celular,
            cep: parte.cep,
            logradouro: parte.logradouro,
            numero: parte.numero,
            complemento: parte.complemento,
            bairro: parte.bairro,
            cidade: parte.cidade,
            uf: parte.uf,
          }))
        } : undefined,
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

  async update(id: string, data: any, userId?: string) {
    const processo = await prisma.processo.findUnique({
      where: { id }
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    const updated = await prisma.processo.update({
      where: { id },
      data,
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

    // FASE 3.2: Registrar auditoria (somente se userId for fornecido)
    if (userId) {
      try {
        await AuditService.createLog({
          entityType: 'Processo',
          entityId: id,
          action: AuditAction.PROFILE_UPDATED,
          userId: userId,
          oldValue: JSON.stringify(processo),
          newValue: JSON.stringify(updated)
        });
      } catch (error) {
        console.error('Erro ao criar log de auditoria:', error);
        // Não falhar a atualização se o log de auditoria falhar
      }
    }

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
      }).then((result: Array<{ clienteId: string }>) => result.length), // Conta clientes únicos do advogado
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
      processosPorStatus: processosPorStatus.map((p: { status: StatusProcesso; _count: number }) => ({
        status: p.status,
        count: p._count
      }))
    };
  }

  // FASE 2.4: Atualizar partes do processo
  async updatePartes(processoId: string, partes: any[]) {
    const processo = await prisma.processo.findUnique({
      where: { id: processoId },
      include: {
        partes: true
      }
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    const partesAntigas = processo.partes;

    // Remover partes existentes
    await prisma.parteProcessual.deleteMany({
      where: { processoId }
    });

    // Criar novas partes
    if (partes && partes.length > 0) {
      await prisma.parteProcessual.createMany({
        data: partes.map((parte: any) => ({
          processoId,
          clienteId: parte.clienteId || null,
          tipoParte: parte.tipoParte,
          tipoPessoa: parte.tipoPessoa,
          nomeCompleto: parte.nomeCompleto,
          cpf: parte.cpf,
          rg: parte.rg,
          orgaoEmissor: parte.orgaoEmissor,
          nacionalidade: parte.nacionalidade,
          estadoCivil: parte.estadoCivil,
          profissao: parte.profissao,
          dataNascimento: parte.dataNascimento ? new Date(parte.dataNascimento) : null,
          razaoSocial: parte.razaoSocial,
          nomeFantasia: parte.nomeFantasia,
          cnpj: parte.cnpj,
          inscricaoEstadual: parte.inscricaoEstadual,
          representanteLegal: parte.representanteLegal,
          cargoRepresentante: parte.cargoRepresentante,
          email: parte.email,
          telefone: parte.telefone,
          celular: parte.celular,
          cep: parte.cep,
          logradouro: parte.logradouro,
          numero: parte.numero,
          complemento: parte.complemento,
          bairro: parte.bairro,
          cidade: parte.cidade,
          uf: parte.uf,
        }))
      });
    }

    // FASE 3.2: Registrar auditoria
    await AuditService.createLog({
      entityType: 'Processo',
      entityId: processoId,
      action: AuditAction.PROFILE_UPDATED,
      userId: processo.advogadoId,
      oldValue: JSON.stringify(partesAntigas),
      newValue: JSON.stringify(partes)
    });

    return { message: 'Partes atualizadas com sucesso' };
  }

  // Salvar movimentações do PROJUDI
  async salvarMovimentacoes(
    processoId: string,
    movimentacoes: Array<{
      sequencial?: number;
      data: string;
      evento: string;
      descricao?: string;
      movimentadoPor?: string;
      tipoMovimento?: string;
    }>
  ): Promise<number> {
    let count = 0;

    for (const mov of movimentacoes) {
      try {
        // Converter data do formato DD/MM/YYYY HH:MM:SS para DateTime
        const [dataParte, horaParte] = mov.data.split(' ');
        const [dia, mes, ano] = dataParte.split('/');
        const [hora, minuto, segundo] = horaParte ? horaParte.split(':') : ['00', '00', '00'];

        const dataMovimentacao = new Date(
          parseInt(ano),
          parseInt(mes) - 1,
          parseInt(dia),
          parseInt(hora || '0'),
          parseInt(minuto || '0'),
          parseInt(segundo || '0')
        );

        // Verificar se já existe (usar upsert para evitar duplicatas)
        await prisma.movimentacaoProcesso.upsert({
          where: {
            processoId_sequencial_origem: {
              processoId,
              sequencial: mov.sequencial || 0,
              origem: 'PROJUDI'
            }
          },
          update: {
            data: dataMovimentacao,
            evento: mov.evento,
            descricao: mov.descricao,
            movimentadoPor: mov.movimentadoPor,
            tipoMovimento: mov.tipoMovimento
          },
          create: {
            processoId,
            sequencial: mov.sequencial,
            data: dataMovimentacao,
            evento: mov.evento,
            descricao: mov.descricao,
            movimentadoPor: mov.movimentadoPor,
            tipoMovimento: mov.tipoMovimento,
            origem: 'PROJUDI'
          }
        });

        count++;
      } catch (error) {
        console.error('Erro ao salvar movimentação:', error, mov);
        // Continua salvando as outras mesmo se uma falhar
      }
    }

    return count;
  }
}
