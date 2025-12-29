import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PDFService } from '../services/pdf.service';
import { DOCXService } from '../services/docx.service';
import { TXTService } from '../services/txt.service';
import { RTFService } from '../services/rtf.service';
import { retry } from '../utils/retry';
import { logger } from '../utils/logger';
import fs from 'fs';
import { buildDownloadFilename } from '../utils/file-utils';

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
      const formatoNormalizado = typeof formato === 'string' ? formato.toLowerCase() : '';

      if (!processoId || !clienteId || !titulo || !conteudoHTML) {
        return res.status(400).json({ error: 'processoId, clienteId, titulo e conteudoHTML sÃ£o obrigatÃ³rios' });
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
        return res.status(404).json({ error: 'Processo nÃ£o encontrado' });
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
   * Buscar um documento especÃ­fico
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
        return res.status(404).json({ error: 'Documento nÃ£o encontrado' });
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
        return res.status(404).json({ error: 'Documento nÃ£o encontrado' });
      }

      // Atualizar documento (incrementar versÃ£o)
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

      logger.info({ msg: '[EXPORT] Iniciando exportaÃ§Ã£o', id, formato, userId });

      if (!formatoNormalizado || !['pdf', 'docx', 'txt', 'rtf'].includes(formatoNormalizado)) {
        return res.status(400).json({ error: 'Formato invÃ¡lido. Use: pdf, docx, txt ou rtf' });
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
        logger.error({ msg: '[EXPORT] Advogado nÃ£o encontrado', userId });
        return res.status(403).json({ error: 'Acesso negado' });
      }

      logger.debug({ msg: '[EXPORT] Advogado encontrado', advogadoId: advogado.id });

      // Buscar documento
      const documento = await prisma.documentoProcesso.findFirst({
        where: {
          id,
          advogadoId: advogado.id
        }
      });

      if (!documento) {
        logger.error({ msg: '[EXPORT] Documento nÃ£o encontrado', id, advogadoId: advogado.id });
        return res.status(404).json({ error: 'Documento nÃ£o encontrado' });
      }

      logger.info({ msg: '[EXPORT] Documento encontrado', titulo: documento.titulo });

      const options = advogado.configuracaoIA ? {
        cabecalho: advogado.configuracaoIA.cabecalho || undefined,
        rodape: advogado.configuracaoIA.rodape || undefined
      } : undefined;

      // Gerar arquivo com retry automÃ¡tico
      const filepath = await retry(async () => {
        logger.info({ msg: '[EXPORT] Gerando arquivo', formato });

        switch (formatoNormalizado) {
          case 'pdf':
            return await pdfService.gerarPDF(documento.conteudoHTML, documento.titulo, options);
          case 'docx':
            return await docxService.gerarDOCX(documento.conteudoHTML, documento.titulo, options);
          case 'txt':
            return await txtService.gerarTXT(documento.conteudoHTML, documento.titulo, options);
          case 'rtf':
            return await rtfService.gerarRTF(documento.conteudoHTML, documento.titulo, options);
          default:
            throw new Error('Formato nÃ£o suportado');
        }
      }, {
        maxTentativas: 3,
        delayBase: 1000,
        onRetry: (tentativa, error) => {
          logger.warn({ msg: '[EXPORT] Retry de exportaÃ§Ã£o', tentativa, error: error.message, formato });
        }
      });

      logger.info({ msg: '[EXPORT] Arquivo gerado com sucesso', filepath });
      const downloadName = buildDownloadFilename(documento.titulo, formatoNormalizado);

      // Definir Content-Type explÃ­cito
      res.setHeader('Content-Type', MIME_TYPES[formatoNormalizado]);

      // Enviar arquivo para download
      res.download(filepath, downloadName, (err) => {
        if (err) {
          logger.error({ msg: '[EXPORT] Erro ao enviar arquivo', error: err, filepath });
        } else {
          logger.info({ msg: '[EXPORT] Arquivo enviado com sucesso', filepath });
        }

        // Deletar arquivo apÃ³s download (mesmo em caso de erro)
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            logger.debug({ msg: '[EXPORT] Arquivo temporÃ¡rio deletado', filepath });
            }
          } catch (deleteErr) {
            logger.error({ msg: '[EXPORT] Erro ao deletar arquivo temporÃ¡rio', error: deleteErr, filepath });
          }
      });
    } catch (error: any) {
      logger.error({ msg: '[EXPORT] Erro ao exportar documento', error: error.message, stack: error.stack });
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
        return res.status(404).json({ error: 'Documento nÃ£o encontrado' });
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




