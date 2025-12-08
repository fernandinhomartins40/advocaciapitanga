import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PDFService } from '../services/pdf.service';
import { DOCXService } from '../services/docx.service';
import { TXTService } from '../services/txt.service';
import { RTFService } from '../services/rtf.service';

const pdfService = new PDFService();
const docxService = new DOCXService();
const txtService = new TXTService();
const rtfService = new RTFService();

export class DocumentoProcessoController {
  /**
   * Criar um novo documento vinculado ao processo
   */
  async criar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId, clienteId, templateId, titulo, conteudoHTML } = req.body;
      const userId = req.user!.userId;

      if (!processoId || !clienteId || !titulo || !conteudoHTML) {
        return res.status(400).json({ error: 'processoId, clienteId, titulo e conteudoHTML são obrigatórios' });
      }

      const { prisma } = await import('database');

      // Buscar advogado
      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem criar documentos' });
      }

      // Verificar se o processo pertence ao advogado
      const processo = await prisma.processo.findFirst({
        where: {
          id: processoId,
          advogadoId: advogado.id
        }
      });

      if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      // Criar documento
      const documento = await prisma.documentoProcesso.create({
        data: {
          processoId,
          clienteId,
          advogadoId: advogado.id,
          templateId: templateId || null,
          titulo,
          conteudoHTML,
          versao: 1
        },
        include: {
          processo: {
            select: {
              numero: true
            }
          },
          cliente: {
            include: {
              user: {
                select: {
                  nome: true
                }
              }
            }
          },
          template: {
            select: {
              nome: true
            }
          }
        }
      });

      res.status(201).json(documento);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Listar documentos de um processo
   */
  async listarPorProcesso(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId } = req.params;
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      // Buscar advogado
      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar documentos
      const documentos = await prisma.documentoProcesso.findMany({
        where: {
          processoId,
          advogadoId: advogado.id
        },
        include: {
          template: {
            select: {
              nome: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(documentos);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Buscar um documento específico
   */
  async buscar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      // Buscar advogado
      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar documento
      const documento = await prisma.documentoProcesso.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        },
        include: {
          processo: {
            select: {
              numero: true
            }
          },
          cliente: {
            include: {
              user: {
                select: {
                  nome: true
                }
              }
            }
          },
          template: {
            select: {
              nome: true
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

  /**
   * Atualizar documento
   */
  async atualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { titulo, conteudoHTML } = req.body;
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      // Buscar advogado
      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Verificar se documento existe e pertence ao advogado
      const documentoExistente = await prisma.documentoProcesso.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        }
      });

      if (!documentoExistente) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Atualizar documento (incrementar versão)
      const documento = await prisma.documentoProcesso.update({
        where: { id },
        data: {
          titulo: titulo || documentoExistente.titulo,
          conteudoHTML: conteudoHTML || documentoExistente.conteudoHTML,
          versao: { increment: 1 }
        },
        include: {
          processo: {
            select: {
              numero: true
            }
          },
          cliente: {
            include: {
              user: {
                select: {
                  nome: true
                }
              }
            }
          },
          template: {
            select: {
              nome: true
            }
          }
        }
      });

      res.json(documento);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Exportar documento em diferentes formatos
   */
  async exportar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { formato } = req.body; // pdf, docx, txt, rtf
      const userId = req.user!.userId;

      if (!formato || !['pdf', 'docx', 'txt', 'rtf'].includes(formato)) {
        return res.status(400).json({ error: 'Formato inválido. Use: pdf, docx, txt ou rtf' });
      }

      const { prisma } = await import('database');

      // Buscar advogado
      const advogado = await prisma.advogado.findUnique({
        where: { userId },
        include: {
          configuracaoIA: true
        }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar documento
      const documento = await prisma.documentoProcesso.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        }
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      const options = advogado.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      let filepath: string;

      switch (formato) {
        case 'pdf':
          filepath = await pdfService.gerarPDF(documento.conteudoHTML, documento.titulo, options);
          break;
        case 'docx':
          filepath = await docxService.gerarDOCX(documento.conteudoHTML, documento.titulo, options);
          break;
        case 'txt':
          filepath = await txtService.gerarTXT(documento.conteudoHTML, documento.titulo, options);
          break;
        case 'rtf':
          filepath = await rtfService.gerarRTF(documento.conteudoHTML, documento.titulo, options);
          break;
        default:
          return res.status(400).json({ error: 'Formato não suportado' });
      }

      res.download(filepath, `${documento.titulo}.${formato}`, (err) => {
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

  /**
   * Deletar documento
   */
  async deletar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const { prisma } = await import('database');

      // Buscar advogado
      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Verificar se documento existe e pertence ao advogado
      const documento = await prisma.documentoProcesso.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        }
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Deletar documento
      await prisma.documentoProcesso.delete({
        where: { id }
      });

      res.json({ message: 'Documento deletado com sucesso' });
    } catch (error: any) {
      next(error);
    }
  }
}
