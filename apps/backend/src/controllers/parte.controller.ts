import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class ParteController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { prisma } = await import('database');
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      let partes;

      if (userRole === 'ADVOGADO') {
        // Buscar advogado
        const advogado = await prisma.advogado.findUnique({
          where: { userId }
        });

        if (!advogado) {
          return res.status(403).json({ error: 'Advogado não encontrado' });
        }

        // Buscar partes de processos do advogado
        partes = await prisma.parteProcessual.findMany({
          where: {
            processo: {
              advogadoId: advogado.id
            }
          },
          select: {
            id: true,
            tipoParte: true,
            tipoPessoa: true,
            nomeCompleto: true,
            cpf: true,
            cnpj: true,
            rg: true,
            orgaoEmissor: true,
            nacionalidade: true,
            estadoCivil: true,
            profissao: true,
            dataNascimento: true,
            razaoSocial: true,
            nomeFantasia: true,
            inscricaoEstadual: true,
            representanteLegal: true,
            cargoRepresentante: true,
            email: true,
            telefone: true,
            celular: true,
            cep: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            clienteId: true,
          },
          orderBy: {
            nomeCompleto: 'asc'
          },
          distinct: ['cpf', 'cnpj', 'nomeCompleto'],
        });
      } else {
        // Clientes não têm acesso
        return res.status(403).json({ error: 'Acesso negado' });
      }

      res.json({ partes });
    } catch (error: any) {
      next(error);
    }
  }
}
