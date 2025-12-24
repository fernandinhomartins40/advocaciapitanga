import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PDFService } from '../services/pdf.service';
import { DOCXService } from '../services/docx.service';
import { TXTService } from '../services/txt.service';
import { RTFService } from '../services/rtf.service';
import { retry } from '../utils/retry';
import { logger } from '../utils/logger';
import fs from 'fs';

const pdfService = new PDFService();
const docxService = new DOCXService();
const txtService = new TXTService();
const rtfService = new RTFService();

// Mapeamento de MIME types por formato
const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  rtf: 'application/rtf'
};

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

      logger.info('[EXPORT] Iniciando exportação', { id, formato, userId });

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
        logger.error('[EXPORT] Advogado não encontrado', { userId });
        return res.status(403).json({ error: 'Acesso negado' });
      }

      logger.debug('[EXPORT] Advogado encontrado', { advogadoId: advogado.id });

      // Buscar documento
      const documento = await prisma.documentoProcesso.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        }
      });

      if (!documento) {
        logger.error('[EXPORT] Documento não encontrado', { id, advogadoId: advogado.id });
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      logger.info('[EXPORT] Documento encontrado', { titulo: documento.titulo });

      const options = advogado.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      // Gerar arquivo com retry automático
      const filepath = await retry(async () => {
        logger.info('[EXPORT] Gerando arquivo', { formato });

        switch (formato) {
          case 'pdf':
            return await pdfService.gerarPDF(documento.conteudoHTML, documento.titulo, options);
          case 'docx':
            return await docxService.gerarDOCX(documento.conteudoHTML, documento.titulo, options);
          case 'txt':
            return await txtService.gerarTXT(documento.conteudoHTML, documento.titulo, options);
          case 'rtf':
            return await rtfService.gerarRTF(documento.conteudoHTML, documento.titulo, options);
          default:
            throw new Error('Formato não suportado');
        }
      }, {
        maxTentativas: 3,
        delayBase: 1000,
        onRetry: (tentativa, error) => {
          logger.warn('[EXPORT] Retry de exportação', { tentativa, error: error.message, formato });
        }
      });

      logger.info('[EXPORT] Arquivo gerado com sucesso', { filepath });

      // Definir Content-Type explícito
      res.setHeader('Content-Type', MIME_TYPES[formato]);
      res.setHeader('Content-Disposition', `attachment; filename="${documento.titulo}.${formato}"`);

      // Enviar arquivo para download
      res.download(filepath, `${documento.titulo}.${formato}`, (err) => {
        if (err) {
          logger.error('[EXPORT] Erro ao enviar arquivo', { error: err, filepath });
        } else {
          logger.info('[EXPORT] Arquivo enviado com sucesso', { filepath });
        }

        // Deletar arquivo após download (mesmo em caso de erro)
        setTimeout(() => {
          try {
            if (fs.existsSync(filepath)) {
              fs.unlinkSync(filepath);
              logger.debug('[EXPORT] Arquivo temporário deletado', { filepath });
            }
          } catch (deleteErr) {
            logger.error('[EXPORT] Erro ao deletar arquivo temporário', { error: deleteErr, filepath });
          }
        }, 1000); // Aguardar 1s para garantir que o download iniciou
      });
    } catch (error: any) {
      logger.error('[EXPORT] Erro ao exportar documento', { error: error.message, stack: error.stack });
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
