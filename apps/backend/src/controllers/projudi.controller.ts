import { Response, NextFunction } from 'express';
import { ProjudiScraperService } from '../services/projudi-scraper.service';
import { ProcessoService } from '../services/processo.service';
import { AuthRequest } from '../types';
import { AuditService, AuditAction } from '../services/audit.service';

const projudiScraperService = new ProjudiScraperService();
const processoService = new ProcessoService();

export class ProjudiController {
  /**
   * Verifica status da integracao PROJUDI
   */
  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scraperEnabled = true; // Scraper sempre disponivel

      res.json({
        scraper: {
          enabled: scraperEnabled,
          disponivel: true,
          metodo: 'SCRAPING_ASSISTIDO',
          descricao: 'Consulta manual com resolucao de CAPTCHA pelo usuario'
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * ESTRATEGIA 1 (SCRAPING): Inicia consulta e retorna CAPTCHA
   */
  async iniciarCaptcha(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Buscar processo com tratamento de erros controlado
      let processo;
      try {
        processo = await processoService.getById(id, userId, req.user!.role);
      } catch (err: any) {
        if (this.handleProcessoErro(err, res)) return;
        throw err;
      }

      // Validar se e processo do Parana
      if (processo.uf !== 'PR') {
        return res.status(400).json({
          error: 'Consulta PROJUDI disponivel apenas para processos do Parana (PR)'
        });
      }

      // Iniciar consulta e obter CAPTCHA
      const resultado = await projudiScraperService.iniciarConsulta(
        processo.numero,
        userId
      );

      // Registrar tentativa
      await AuditService.createLog({
        entityType: 'Processo',
        entityId: id,
        action: AuditAction.PROFILE_UPDATED,
        userId,
        newValue: JSON.stringify({ acao: 'INICIOU_CONSULTA_PROJUDI' })
      });

      res.json(resultado);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * ESTRATEGIA 1 (SCRAPING): Consulta com CAPTCHA resolvido
   */
  async consultarComCaptcha(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { sessionId, captchaResposta } = req.body;
      const userId = req.user!.userId;

      if (!sessionId || !captchaResposta) {
        return res.status(400).json({
          error: 'SessionId e captchaResposta sao obrigatorios'
        });
      }

      // Buscar processo com tratamento de erros controlado
      let processo;
      try {
        processo = await processoService.getById(id, userId, req.user!.role);
      } catch (err: any) {
        if (this.handleProcessoErro(err, res)) return;
        throw err;
      }

      if (processo.uf !== 'PR') {
        return res.status(400).json({
          error: 'Consulta PROJUDI disponivel apenas para processos do Parana (PR)'
        });
      }

      // Consultar PROJUDI com CAPTCHA
      const dadosProjudi = await projudiScraperService.consultarComCaptcha(
        sessionId,
        captchaResposta,
        userId
      );

      // Preparar dados para atualizacao
      const dadosAtualizacao: any = {};

      if (dadosProjudi.comarca) dadosAtualizacao.comarca = dadosProjudi.comarca;
      if (dadosProjudi.vara) dadosAtualizacao.vara = dadosProjudi.vara;
      if (dadosProjudi.foro) dadosAtualizacao.foro = dadosProjudi.foro;
      if (dadosProjudi.status) {
        dadosAtualizacao.status = projudiScraperService.mapearStatus(dadosProjudi.status);
      }
      if (dadosProjudi.dataDistribuicao) {
        try {
          const [dia, mes, ano] = dadosProjudi.dataDistribuicao.split('/');
          dadosAtualizacao.dataDistribuicao = new Date(`${ano}-${mes}-${dia}`);
        } catch {
          // Ignora se data invalida
        }
      }
      if (dadosProjudi.valorCausa) {
        const valor = projudiScraperService.parseValor(dadosProjudi.valorCausa);
        if (valor) dadosAtualizacao.valorCausa = valor;
      }
      if (dadosProjudi.objetoAcao) {
        dadosAtualizacao.objetoAcao = dadosProjudi.objetoAcao;
      }

      // Atualizar processo
      const processoAtualizado = await processoService.update(id, dadosAtualizacao);

      // Atualizar partes se disponiveis
      if (dadosProjudi.partes && dadosProjudi.partes.length > 0) {
        const partesMapeadas = dadosProjudi.partes.map(parte => ({
          tipoParte: this.mapearTipoParte(parte.tipo),
          tipoPessoa: parte.cpf ? 'FISICA' : 'JURIDICA',
          nomeCompleto: parte.nome,
          cpf: parte.cpf || null
        }));

        // Sobrescreve partes para refletir fielmente o PROJUDI
        await processoService.updatePartes(id, partesMapeadas);
      }

      // Registrar sucesso
      await AuditService.createLog({
        entityType: 'Processo',
        entityId: id,
        action: AuditAction.PROFILE_UPDATED,
        userId,
        oldValue: JSON.stringify(processo),
        newValue: JSON.stringify(processoAtualizado)
      });

      res.json({
        sucesso: true,
        processo: processoAtualizado,
        dadosExtraidos: dadosProjudi,
        camposAtualizados: Object.keys(dadosAtualizacao)
      });
    } catch (error: any) {
      // Registrar falha
      await AuditService.createLog({
        entityType: 'Processo',
        entityId: req.params.id,
        action: AuditAction.PROFILE_UPDATED,
        userId: req.user!.userId,
        newValue: JSON.stringify({ erro: error.message, fonte: 'PROJUDI_SCRAPING' })
      });

      next(error);
    }
  }

  /**
   * Mapeia tipo de parte do PROJUDI para enum do sistema
   */
  private mapearTipoParte(tipo: string): string {
    const tipoUpper = tipo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (tipoUpper.includes('AUTOR') || tipoUpper.includes('REQUERENTE') || tipoUpper.includes('ATIVO')) {
      return 'AUTOR';
    }
    if (tipoUpper.includes('REU') || tipoUpper.includes('REQUERIDO') || tipoUpper.includes('PASSIVO')) {
      return 'REU';
    }
    if (tipoUpper.includes('TERCEIRO')) {
      return 'TERCEIRO_INTERESSADO';
    }
    if (tipoUpper.includes('ASSISTENTE')) {
      return 'ASSISTENTE';
    }

    return 'TERCEIRO_INTERESSADO';
  }

  /**
   * Endpoint para testar configuracao
   */
  async testarConfiguracao(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Apenas advogados/admins podem testar
      if (req.user!.role !== 'ADVOGADO' && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      res.json({
        scraper: {
          disponivel: true,
          status: 'OK'
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Obtem informacoes sobre o limite de consultas do usuario
   */
  async obterInfoLimite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const info = projudiScraperService.obterInfoLimite(userId);

      res.json({
        ...info,
        limiteDiario: 100,
        delayEntreConsultas: 3
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reseta o limite de consultas do usuario (apenas para desenvolvimento/admin)
   */
  async resetarLimite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Apenas admins podem resetar limites
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'ADMIN_ESCRITORIO') {
        return res.status(403).json({
          error: 'Apenas administradores podem resetar limites de consulta'
        });
      }

      const userId = req.user!.userId;
      projudiScraperService.resetarLimiteUsuario(userId);

      res.json({
        sucesso: true,
        mensagem: 'Limite de consultas resetado com sucesso'
      });
    } catch (error: any) {
      next(error);
    }
  }

  private handleProcessoErro(err: any, res: Response): boolean {
    const mensagem = (err?.message || '').toLowerCase();
    if (mensagem.includes('processo') && mensagem.includes('encontr')) {
      res.status(404).json({ error: 'Processo nao encontrado' });
      return true;
    }
    if (mensagem.includes('acesso negado')) {
      res.status(403).json({ error: 'Acesso negado' });
      return true;
    }
    return false;
  }
}
