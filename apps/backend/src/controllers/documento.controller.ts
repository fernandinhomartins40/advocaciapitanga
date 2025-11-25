import { Response, NextFunction } from 'express';
import { prisma } from 'database';
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
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { processoId, tipo, page, limit } = req.query;
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
            }
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.documento.count({ where })
      ]);

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
        },
        include: {
          processo: {
            select: {
              numero: true,
            }
          }
        }
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
      if (!fs.existsSync(documento.caminho)) {
        return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
      }

      res.download(documento.caminho, documento.titulo);
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
      if (fs.existsSync(documento.caminho)) {
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
