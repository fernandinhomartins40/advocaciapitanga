import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { IAService } from '../services/ia.service';
import { PDFService } from '../services/pdf.service';
import { DOCXService } from '../services/docx.service';
import { TXTService } from '../services/txt.service';
import { RTFService } from '../services/rtf.service';

const iaService = new IAService();
const pdfService = new PDFService();
const docxService = new DOCXService();
const txtService = new TXTService();
const rtfService = new RTFService();

export class IAController {
  async gerarPeca(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tipoPeca, contexto, fundamentosLegais, pedidos, partes, clienteId, processoId } = req.body;
      const userId = req.user!.userId;

      if (!tipoPeca || !contexto) {
        return res.status(400).json({ error: 'Tipo de peça e contexto são obrigatórios' });
      }

      // Buscar advogadoId do usuário logado
      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem gerar peças' });
      }

      // Buscar dados do cliente e processo se fornecidos
      let dadosCliente = null;
      let dadosProcesso = null;

      if (clienteId) {
        dadosCliente = await prisma.cliente.findUnique({
          where: { id: clienteId },
          include: {
            user: {
              select: {
                nome: true,
                email: true
              }
            }
          }
        });
      }

      if (processoId) {
        dadosProcesso = await prisma.processo.findUnique({
          where: { id: processoId },
          include: {
            cliente: {
              include: {
                user: {
                  select: {
                    nome: true,
                    email: true
                  }
                }
              }
            }
          }
        });
      }

      // Gerar peça com IA, passando advogadoId para buscar configurações
      const conteudo = await iaService.gerarPecaJuridica({
        tipoPeca,
        contexto,
        fundamentosLegais,
        pedidos,
        partes,
        dadosCliente,
        dadosProcesso
      }, advogado.id);

      // Salvar no banco de dados
      const documentoIA = await prisma.documentoIA.create({
        data: {
          advogadoId: advogado.id,
          clienteId: clienteId || null,
          processoId: processoId || null,
          tipoPeca,
          contexto,
          fundamentosLegais: fundamentosLegais || null,
          pedidos: pedidos || null,
          partes: partes ? JSON.stringify(partes) : null,
          conteudoGerado: conteudo,
          titulo: tipoPeca
        }
      });

      res.json({ conteudo, documentoId: documentoIA.id });
    } catch (error: any) {
      next(error);
    }
  }

  async exportarPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'Conteúdo e título são obrigatórios' });
      }

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId },
        include: {
          configuracaoIA: true
        }
      });

      const options = advogado?.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      const filepath = await pdfService.gerarPDF(conteudo, titulo, options);

      res.download(filepath, `${titulo}.pdf`, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
        }
        // Deletar arquivo após download
        const fs = require('fs');
        fs.unlinkSync(filepath);
      });
    } catch (error: any) {
      next(error);
    }
  }

  async exportarDOCX(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'Conteúdo e título são obrigatórios' });
      }

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId },
        include: {
          configuracaoIA: true
        }
      });

      const options = advogado?.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      const filepath = await docxService.gerarDOCX(conteudo, titulo, options);

      res.download(filepath, `${titulo}.docx`, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
        }
        // Deletar arquivo após download
        const fs = require('fs');
        fs.unlinkSync(filepath);
      });
    } catch (error: any) {
      next(error);
    }
  }

  async analisarDocumento(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo) {
        return res.status(400).json({ error: 'Conteúdo é obrigatório' });
      }

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem analisar documentos' });
      }

      const analise = await iaService.analisarDocumento(conteudo, advogado.id);

      res.json({ analise });
    } catch (error: any) {
      next(error);
    }
  }

  async listarHistorico(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { page = 1, limit = 20 } = req.query;

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem acessar o histórico' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [documentos, total] = await Promise.all([
        prisma.documentoIA.findMany({
          where: { advogadoId: advogado.id },
          include: {
            cliente: {
              include: {
                user: {
                  select: {
                    nome: true
                  }
                }
              }
            },
            processo: {
              select: {
                numero: true,
                descricao: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.documentoIA.count({
          where: { advogadoId: advogado.id }
        })
      ]);

      res.json({
        documentos,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  async buscarDocumento(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const documento = await prisma.documentoIA.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        },
        include: {
          cliente: {
            include: {
              user: {
                select: {
                  nome: true,
                  email: true
                }
              }
            }
          },
          processo: {
            select: {
              numero: true,
              descricao: true
            }
          }
        }
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      res.json(documento);
    } catch (error: any) {
      next(error);
    }
  }

  async exportarTXT(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'Conteúdo e título são obrigatórios' });
      }

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId },
        include: {
          configuracaoIA: true
        }
      });

      const options = advogado?.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      const filepath = await txtService.gerarTXT(conteudo, titulo, options);

      res.download(filepath, `${titulo}.txt`, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
        }
        const fs = require('fs');
        fs.unlinkSync(filepath);
      });
    } catch (error: any) {
      next(error);
    }
  }

  async exportarRTF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'Conteúdo e título são obrigatórios' });
      }

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId },
        include: {
          configuracaoIA: true
        }
      });

      const options = advogado?.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      const filepath = await rtfService.gerarRTF(conteudo, titulo, options);

      res.download(filepath, `${titulo}.rtf`, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
        }
        const fs = require('fs');
        fs.unlinkSync(filepath);
      });
    } catch (error: any) {
      next(error);
    }
  }
}
