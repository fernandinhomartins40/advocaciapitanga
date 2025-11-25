import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { IAService } from '../services/ia.service';
import { PDFService } from '../services/pdf.service';
import { DOCXService } from '../services/docx.service';

const iaService = new IAService();
const pdfService = new PDFService();
const docxService = new DOCXService();

export class IAController {
  async gerarPeca(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tipoPeca, contexto, fundamentosLegais, pedidos, partes } = req.body;

      if (!tipoPeca || !contexto) {
        return res.status(400).json({ error: 'Tipo de peça e contexto são obrigatórios' });
      }

      const conteudo = await iaService.gerarPecaJuridica({
        tipoPeca,
        contexto,
        fundamentosLegais,
        pedidos,
        partes
      });

      res.json({ conteudo });
    } catch (error: any) {
      next(error);
    }
  }

  async exportarPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { conteudo, titulo } = req.body;

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'Conteúdo e título são obrigatórios' });
      }

      const filepath = await pdfService.gerarPDF(conteudo, titulo);

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

      if (!conteudo || !titulo) {
        return res.status(400).json({ error: 'Conteúdo e título são obrigatórios' });
      }

      const filepath = await docxService.gerarDOCX(conteudo, titulo);

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

      if (!conteudo) {
        return res.status(400).json({ error: 'Conteúdo é obrigatório' });
      }

      const analise = await iaService.analisarDocumento(conteudo);

      res.json({ analise });
    } catch (error: any) {
      next(error);
    }
  }
}
