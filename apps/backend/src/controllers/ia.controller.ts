import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { IAService } from '../services/ia.service';
import { PDFService } from '../services/pdf.service';
import { DOCXService } from '../services/docx.service';
import { TXTService } from '../services/txt.service';
import { RTFService } from '../services/rtf.service';
import { buildDownloadFilename } from '../utils/file-utils';

const iaService = new IAService();
const pdfService = new PDFService();
const docxService = new DOCXService();
const txtService = new TXTService();
const rtfService = new RTFService();

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  rtf: 'application/rtf'
};

export class IAController {
  async gerarPeca(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tipoPeca, contexto, fundamentosLegais, pedidos, partes, clienteId, processoId, templateId } = req.body;
      const userId = req.user!.userId;

      if (!tipoPeca || !contexto) {
        return res.status(400).json({ error: 'Tipo de peÃ§a e contexto sÃ£o obrigatÃ³rios' });
      }

      // Buscar advogadoId do usuÃ¡rio logado
      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem gerar peÃ§as' });
      }

      // Buscar template se fornecido
      let templateBase = null;
      if (templateId) {
        templateBase = await prisma.documentTemplate.findUnique({
          where: { id: templateId }
        });
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

      let dadosPartes: any[] | undefined = undefined;
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
            },
            partes: true
          }
        });

        // Extrair partes do processo
        if (dadosProcesso?.partes) {
          dadosPartes = dadosProcesso.partes as any[];
        }
      }

      // Gerar peÃ§a com IA, passando advogadoId para buscar configuraÃ§Ãµes
      const conteudo = await iaService.gerarPecaJuridica({
        tipoPeca,
        contexto,
        fundamentosLegais,
        pedidos,
        partes,
        dadosCliente,
        dadosProcesso,
        dadosPartes,
        templateBase: templateBase?.conteudo
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
        return res.status(400).json({ error: 'ConteÃºdo e tÃ­tulo sÃ£o obrigatÃ³rios' });
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

      const buffer = await pdfService.gerarPDF(conteudo, titulo, options);

      const downloadName = buildDownloadFilename(titulo, 'pdf');
      res.setHeader('Content-Type', MIME_TYPES.pdf);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }

  async exportarDOCX(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'ConteÃºdo e tÃ­tulo sÃ£o obrigatÃ³rios' });
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

      const buffer = await docxService.gerarDOCX(conteudo, titulo, options);

      const downloadName = buildDownloadFilename(titulo, 'docx');
      res.setHeader('Content-Type', MIME_TYPES.docx);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }

  async analisarDocumento(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo) {
        return res.status(400).json({ error: 'ConteÃºdo Ã© obrigatÃ³rio' });
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
        return res.status(403).json({ error: 'Apenas advogados podem acessar o histÃ³rico' });
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
                objetoAcao: true
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
              objetoAcao: true
            }
          }
        }
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento nÃ£o encontrado' });
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
        return res.status(400).json({ error: 'ConteÃºdo e tÃ­tulo sÃ£o obrigatÃ³rios' });
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

      const buffer = await txtService.gerarTXT(conteudo, titulo, options);

      const downloadName = buildDownloadFilename(titulo, 'txt');
      res.setHeader('Content-Type', MIME_TYPES.txt);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }

  async exportarRTF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;
      const userId = req.user!.userId;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'ConteÃºdo e tÃ­tulo sÃ£o obrigatÃ³rios' });
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

      const buffer = await rtfService.gerarRTF(conteudo, titulo, options);

      const downloadName = buildDownloadFilename(titulo, 'rtf');
      res.setHeader('Content-Type', MIME_TYPES.rtf);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
}


