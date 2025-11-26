import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/bcrypt';
import { validarCPF } from '../utils/cpf';

export class ClienteService {
  async getAll(advogadoId?: string, search?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { user: { nome: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { cpf: { contains: search } },
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nome: true,
              createdAt: true,
            }
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cliente.count({ where })
    ]);

    return { clientes, total, page, limit };
  }

  async getById(id: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
            createdAt: true,
          }
        },
        processos: {
          include: {
            advogado: {
              include: {
                user: {
                  select: {
                    nome: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    return cliente;
  }

  async create(data: {
    nome: string;
    email: string;
    cpf: string;
    telefone?: string;
    endereco?: string;
  }) {
    // Validar CPF
    if (!validarCPF(data.cpf)) {
      throw new Error('CPF inválido');
    }

    // Verificar se email já existe
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingEmail) {
      throw new Error('Email já cadastrado');
    }

    // Verificar se CPF já existe
    const existingCPF = await prisma.cliente.findUnique({
      where: { cpf: data.cpf }
    });

    if (existingCPF) {
      throw new Error('CPF já cadastrado');
    }

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(tempPassword);

    // Criar cliente
    const cliente = await prisma.cliente.create({
      data: {
        cpf: data.cpf,
        telefone: data.telefone,
        endereco: data.endereco,
        user: {
          create: {
            email: data.email,
            nome: data.nome,
            password: hashedPassword,
            role: 'CLIENTE',
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
          }
        }
      }
    });

    return { cliente, tempPassword };
  }

  async update(id: string, data: {
    nome?: string;
    telefone?: string;
    endereco?: string;
  }) {
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    const updated = await prisma.cliente.update({
      where: { id },
      data: {
        telefone: data.telefone,
        endereco: data.endereco,
        ...(data.nome && {
          user: {
            update: {
              nome: data.nome
            }
          }
        })
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nome: true,
          }
        }
      }
    });

    return updated;
  }

  async delete(id: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    await prisma.cliente.delete({
      where: { id }
    });

    return { message: 'Cliente excluído com sucesso' };
  }
}
