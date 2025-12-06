import { Response, NextFunction } from 'express';
import { prisma, DocumentStatus, DocumentAction } from 'database';
import { AuthRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documentos');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

export const uploadMiddleware = upload.single('arquivo');

export class DocumentoController {
  private async registrarHistorico(params: {
    documentoId: string;
    processoId: string;
    userId: string;
    status: DocumentStatus;
    acao: DocumentAction;
    detalhe?: string;
  }) {
    const { documentoId, processoId, userId, status, acao, detalhe } = params;

    await prisma.documentHistory.create({
      data: {
        documentoId,
        processoId,
        userId,
        status,
        acao,
        detalhe,
      },
    });
  }

  private renderTemplate(conteudo: string, dados: Record<string, string | undefined>) {
    return Object.keys(dados).reduce((acc, chave) => {
      const valor = dados[chave] ?? '';
      const regex = new RegExp(`{{\\s*${chave}\\s*}}`, 'g');
      return acc.replace(regex, valor);
    }, conteudo);
  }

  private async montarDadosProcesso(processoId: string) {
    const processo = await prisma.processo.findUnique({
      where: { id: processoId },
      include: {
        cliente: {
          include: { user: true },
        },
        advogado: {
          include: { user: true },
        },
        partes: true,
      },
    });

    if (!processo) return null;

    const cliente = processo.cliente;
    const advogado = processo.advogado;
    const reu = processo.partes.find((p) => p.tipoParte === 'REU');

    return {
      processo_numero: processo.numero,
      descricao_processo: processo.descricao || '',
      cliente_nome: cliente?.user?.nome || '',
      cliente_cpf: cliente?.cpf || '',
      cliente_endereco: cliente?.logradouro ? `${cliente.logradouro}, ${cliente.numero || ''} - ${cliente.bairro || ''}` : '',
      advogado_nome: advogado?.user?.nome || '',
      advogado_oab: advogado?.oab || '',
      reu_nome: reu?.nomeCompleto || '',
      narrativa_fatos: processo.descricao || '',
      valor_causa: processo.valorCausa ? processo.valorCausa.toString() : '',
      preliminares: '',
      merito: '',
      honorarios: '',
    };
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId, tipo, page, limit, includeTemplates } = req.query;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const skip = page ? (parseInt(page as string) - 1) * parseInt(limit as string || '10') : 0;
      const take = limit ? parseInt(limit as string) : 10;

      const where: any = {};

      if (processoId) where.processoId = processoId;
      if (tipo) where.tipo = tipo;

      // Se for cliente, filtrar apenas documentos dos seus processos
      if (userRole === 'CLIENTE') {
        const cliente = await prisma.cliente.findUnique({
          where: { userId }
        });

        if (cliente) {
          where.processo = {
            clienteId: cliente.id
          };
        }
      }

      const [documentos, total] = await Promise.all([
        prisma.documento.findMany({
          where,
          include: {
            processo: {
              select: {
                numero: true,
              }
            },
            folder: true,
            template: true,
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.documento.count({ where })
      ]);

      if (includeTemplates === 'true') {
        const [folders, templates] = await Promise.all([
          prisma.documentFolder.findMany({
            include: { children: true },
          }),
          prisma.documentTemplate.findMany({
            include: {
              folder: true,
            },
            orderBy: { nome: 'asc' },
          }),
        ]);

        res.json({ documentos, total, folders, templates });
        return;
      }

      res.json({ documentos, total });
    } catch (error: any) {
      next(error);
    }
  }

  async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const { titulo, processoId, descricao } = req.body;

      if (!processoId) {
        return res.status(400).json({ error: 'Processo é obrigatório' });
      }

      // Verificar se processo existe
      const processo = await prisma.processo.findUnique({
        where: { id: processoId }
      });

      if (!processo) {
        // Deletar arquivo enviado
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const documento = await prisma.documento.create({
        data: {
          titulo: titulo || req.file.originalname,
          caminho: req.file.path,
          tipo: path.extname(req.file.originalname).substring(1).toUpperCase(),
          tamanho: req.file.size,
          processoId,
          status: DocumentStatus.FINALIZADO,
        },
        include: {
          processo: {
            select: {
              numero: true,
            }
          }
        }
      });

      await this.registrarHistorico({
        documentoId: documento.id,
        processoId: processoId,
        userId: req.user!.userId,
        status: DocumentStatus.FINALIZADO,
        acao: DocumentAction.CRIACAO,
        detalhe: 'Upload de documento',
      });

      res.status(201).json(documento);
    } catch (error: any) {
      // Se houver erro, deletar arquivo
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  async download(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const documento = await prisma.documento.findUnique({
        where: { id },
        include: {
          processo: {
            include: {
              cliente: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Verificar permissão se for cliente
      if (userRole === 'CLIENTE' && documento.processo.cliente.user.id !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Verificar se arquivo existe
      if (!documento.caminho || !fs.existsSync(documento.caminho)) {
        return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
      }

      res.download(documento.caminho, documento.titulo);
    } catch (error: any) {
      next(error);
    }
  }

  async atualizarStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(DocumentStatus).includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const documento = await prisma.documento.update({
        where: { id },
        data: { status },
      });

      await this.registrarHistorico({
        documentoId: id,
        processoId: documento.processoId,
        userId: req.user!.userId,
        status,
        acao: status === DocumentStatus.ANEXADO ? DocumentAction.ANEXADO : DocumentAction.STATUS_ATUALIZADO,
        detalhe: `Status atualizado para ${status}`,
      });

      res.json(documento);
    } catch (error: any) {
      next(error);
    }
  }

  async atualizarDocumento(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { titulo, descricao, conteudo, folderId } = req.body;

      const documento = await prisma.documento.update({
        where: { id },
        data: {
          titulo,
          descricao,
          conteudo,
          tamanho: conteudo ? conteudo.length : undefined,
          folderId: folderId || null,
          status: DocumentStatus.DRAFT,
        },
      });

      await this.registrarHistorico({
        documentoId: id,
        processoId: documento.processoId,
        userId: req.user!.userId,
        status: DocumentStatus.DRAFT,
        acao: DocumentAction.EDICAO,
        detalhe: 'Documento editado',
      });

      res.json(documento);
    } catch (error: any) {
      next(error);
    }
  }

  async historico(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const historico = await prisma.documentHistory.findMany({
        where: { documentoId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { nome: true, email: true } },
        },
      });

      res.json(historico);
    } catch (error: any) {
      next(error);
    }
  }

  async listarPastas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pastas = await prisma.documentFolder.findMany({
        include: {
          children: true,
        },
        orderBy: { nome: 'asc' },
      });

      res.json(pastas);
    } catch (error: any) {
      next(error);
    }
  }

  async criarPasta(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nome, parentId } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
      }

      const pasta = await prisma.documentFolder.create({
        data: { nome, parentId: parentId || null },
      });

      res.status(201).json(pasta);
    } catch (error: any) {
      next(error);
    }
  }

  async listarModelos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const modelos = await prisma.documentTemplate.findMany({
        include: { folder: true },
        orderBy: { nome: 'asc' },
      });

      res.json(modelos);
    } catch (error: any) {
      next(error);
    }
  }

  async criarModelo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nome, descricao, conteudo, folderId } = req.body;

      if (!nome || !conteudo) {
        return res.status(400).json({ error: 'Nome e conteúdo do modelo são obrigatórios' });
      }

      const modelo = await prisma.documentTemplate.create({
        data: {
          nome,
          descricao,
          conteudo,
          folderId: folderId || null,
        },
      });

      res.status(201).json(modelo);
    } catch (error: any) {
      next(error);
    }
  }

  async atualizarModelo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { nome, descricao, conteudo, folderId } = req.body;

      const modelo = await prisma.documentTemplate.update({
        where: { id },
        data: {
          nome,
          descricao,
          conteudo,
          folderId: folderId || null,
        },
      });

      res.json(modelo);
    } catch (error: any) {
      next(error);
    }
  }

  async gerarDeModelo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { processoId, folderId, titulo, descricao, dadosExtras } = req.body;

      if (!processoId) {
        return res.status(400).json({ error: 'Processo é obrigatório' });
      }

      const modelo = await prisma.documentTemplate.findUnique({ where: { id } });

      if (!modelo) {
        return res.status(404).json({ error: 'Modelo não encontrado' });
      }

      const dadosProcesso = await this.montarDadosProcesso(processoId);

      if (!dadosProcesso) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const dados = {
        ...dadosProcesso,
        ...(dadosExtras || {}),
      } as Record<string, string>;

      const conteudoPreenchido = this.renderTemplate(modelo.conteudo, dados);

      const documento = await prisma.documento.create({
        data: {
          titulo: titulo || modelo.nome,
          conteudo: conteudoPreenchido,
          tipo: 'TEMPLATE',
          tamanho: conteudoPreenchido.length,
          processoId,
          folderId: folderId || null,
          templateId: modelo.id,
          status: DocumentStatus.DRAFT,
          descricao: descricao || null,
        },
        include: {
          processo: { select: { numero: true } },
          template: true,
          folder: true,
        },
      });

      await this.registrarHistorico({
        documentoId: documento.id,
        processoId,
        userId: req.user!.userId,
        status: DocumentStatus.DRAFT,
        acao: DocumentAction.GERACAO_IA,
        detalhe: 'Documento gerado a partir de modelo',
      });

      res.status(201).json(documento);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const documento = await prisma.documento.findUnique({
        where: { id }
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Deletar arquivo físico
      if (documento.caminho && fs.existsSync(documento.caminho)) {
        fs.unlinkSync(documento.caminho);
      }

      // Deletar registro do banco
      await prisma.documento.delete({
        where: { id }
      });

      res.json({ message: 'Documento excluído com sucesso' });
    } catch (error: any) {
      next(error);
    }
  }
}


