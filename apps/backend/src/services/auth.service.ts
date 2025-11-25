import { prisma } from 'database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { validarCPF } from '../utils/cpf';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    nome: string;
    role: 'ADVOGADO' | 'CLIENTE';
    cpf?: string;
    oab?: string;
    telefone?: string;
    endereco?: string;
  }) {
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Validar CPF se for cliente
    if (data.role === 'CLIENTE' && data.cpf) {
      if (!validarCPF(data.cpf)) {
        throw new Error('CPF inválido');
      }

      const existingCPF = await prisma.cliente.findUnique({
        where: { cpf: data.cpf }
      });

      if (existingCPF) {
        throw new Error('CPF já cadastrado');
      }
    }

    // Validar OAB se for advogado
    if (data.role === 'ADVOGADO' && data.oab) {
      const existingOAB = await prisma.advogado.findUnique({
        where: { oab: data.oab }
      });

      if (existingOAB) {
        throw new Error('OAB já cadastrada');
      }
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nome: data.nome,
        role: data.role,
        ...(data.role === 'CLIENTE' && {
          cliente: {
            create: {
              cpf: data.cpf!,
              telefone: data.telefone,
              endereco: data.endereco,
            }
          }
        }),
        ...(data.role === 'ADVOGADO' && {
          advogado: {
            create: {
              oab: data.oab!,
              telefone: data.telefone,
            }
          }
        })
      },
      include: {
        cliente: true,
        advogado: true,
      }
    });

    // Gerar tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Salvar refresh token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Remove senha do retorno
    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        cliente: true,
        advogado: true,
      }
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    // Gerar tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Salvar refresh token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Remove senha do retorno
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verificar refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Buscar usuário no banco
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          cliente: true,
          advogado: true,
        }
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Refresh token inválido');
      }

      // Gerar novo access token
      const accessToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Remove senha do retorno
      const { password, refreshToken: _, ...userWithoutPassword } = user;

      return { user: userWithoutPassword, accessToken };
    } catch (error) {
      throw new Error('Refresh token inválido ou expirado');
    }
  }

  async logout(userId: string) {
    // Remover refresh token do banco
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });

    return { message: 'Logout realizado com sucesso' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cliente: true,
        advogado: true,
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const { password, refreshToken, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}
