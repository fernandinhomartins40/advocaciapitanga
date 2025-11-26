import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class ConfiguracaoIAController {
  async obterConfiguracao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem acessar configurações' });
      }

      let configuracao = await prisma.configuracaoIA.findUnique({
        where: { advogadoId: advogado.id }
      });

      // Se não existe, criar configuração padrão
      if (!configuracao) {
        configuracao = await prisma.configuracaoIA.create({
          data: {
            advogadoId: advogado.id,
            modeloGPT: 'gpt-4'
          }
        });
      }

      // Não retornar a API key completa por segurança
      const configSemChave = {
        ...configuracao,
        openaiApiKey: configuracao.openaiApiKey ? '••••••••' : null,
        apiKeyConfigurada: !!configuracao.openaiApiKey
      };

      res.json(configSemChave);
    } catch (error: any) {
      next(error);
    }
  }

  async atualizarConfiguracao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { openaiApiKey, modeloGPT, cabecalho, rodape } = req.body;

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Apenas advogados podem atualizar configurações' });
      }

      // Preparar dados para atualização
      const dataToUpdate: any = {};

      if (modeloGPT) dataToUpdate.modeloGPT = modeloGPT;
      if (cabecalho !== undefined) dataToUpdate.cabecalho = cabecalho;
      if (rodape !== undefined) dataToUpdate.rodape = rodape;

      // Só atualizar API key se foi fornecida e não é o placeholder
      if (openaiApiKey && openaiApiKey !== '••••••••') {
        dataToUpdate.openaiApiKey = openaiApiKey;
      }

      const configuracao = await prisma.configuracaoIA.upsert({
        where: { advogadoId: advogado.id },
        update: dataToUpdate,
        create: {
          advogadoId: advogado.id,
          ...dataToUpdate
        }
      });

      // Não retornar a API key completa
      const configSemChave = {
        ...configuracao,
        openaiApiKey: configuracao.openaiApiKey ? '••••••••' : null,
        apiKeyConfigurada: !!configuracao.openaiApiKey
      };

      res.json(configSemChave);
    } catch (error: any) {
      next(error);
    }
  }

  async testarConexao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { openaiApiKey } = req.body;

      if (!openaiApiKey || openaiApiKey === '••••••••') {
        return res.status(400).json({ error: 'API Key é obrigatória para testar' });
      }

      const { prisma } = await import('database');

      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Testar conexão com OpenAI
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: openaiApiKey });

      try {
        await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        });

        res.json({ success: true, message: 'Conexão com OpenAI estabelecida com sucesso!' });
      } catch (error: any) {
        if (error.status === 401) {
          return res.status(401).json({
            success: false,
            message: 'API Key inválida. Verifique sua chave e tente novamente.'
          });
        }
        throw error;
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao testar conexão: ' + error.message
      });
    }
  }
}
