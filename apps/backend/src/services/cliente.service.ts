import { prisma, TipoPessoa, EstadoCivil } from 'database';
import { hashPassword } from '../utils/bcrypt';
import { validarCPF } from '../utils/cpf';
import { validarCNPJ } from '../utils/cnpj';

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
    tipoPessoa?: TipoPessoa;

    // Pessoa Física
    cpf?: string;
    rg?: string;
    orgaoEmissor?: string;
    nacionalidade?: string;
    estadoCivil?: EstadoCivil;
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
  }) {
    const tipoPessoa = data.tipoPessoa || 'FISICA';

    // Validar CPF ou CNPJ conforme tipo de pessoa
    if (tipoPessoa === 'FISICA' && data.cpf) {
      if (!validarCPF(data.cpf)) {
        throw new Error('CPF inválido');
      }

      // Verificar se CPF já existe
      const existingCPF = await prisma.cliente.findUnique({
        where: { cpf: data.cpf }
      });

      if (existingCPF) {
        throw new Error('CPF já cadastrado');
      }
    }

    if (tipoPessoa === 'JURIDICA' && data.cnpj) {
      if (!validarCNPJ(data.cnpj)) {
        throw new Error('CNPJ inválido');
      }

      // Verificar se CNPJ já existe
      const existingCNPJ = await prisma.cliente.findUnique({
        where: { cnpj: data.cnpj }
      });

      if (existingCNPJ) {
        throw new Error('CNPJ já cadastrado');
      }
    }

    // Verificar se email já existe
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingEmail) {
      throw new Error('Email já cadastrado');
    }

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(tempPassword);

    // Criar cliente
    const cliente = await prisma.cliente.create({
      data: {
        tipoPessoa,

        // Pessoa Física
        cpf: data.cpf,
        rg: data.rg,
        orgaoEmissor: data.orgaoEmissor,
        nacionalidade: data.nacionalidade,
        estadoCivil: data.estadoCivil,
        profissao: data.profissao,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,

        // Pessoa Jurídica
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        inscricaoEstadual: data.inscricaoEstadual,
        representanteLegal: data.representanteLegal,
        cargoRepresentante: data.cargoRepresentante,

        // Contato
        telefone: data.telefone,
        celular: data.celular,

        // Endereço
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,

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

    // Pessoa Física
    rg?: string;
    orgaoEmissor?: string;
    nacionalidade?: string;
    estadoCivil?: EstadoCivil;
    profissao?: string;
    dataNascimento?: string;

    // Pessoa Jurídica
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
        // Pessoa Física
        rg: data.rg,
        orgaoEmissor: data.orgaoEmissor,
        nacionalidade: data.nacionalidade,
        estadoCivil: data.estadoCivil,
        profissao: data.profissao,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,

        // Pessoa Jurídica
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        inscricaoEstadual: data.inscricaoEstadual,
        representanteLegal: data.representanteLegal,
        cargoRepresentante: data.cargoRepresentante,

        // Contato
        telefone: data.telefone,
        celular: data.celular,

        // Endereço
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,

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
