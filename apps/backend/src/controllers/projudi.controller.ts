import { Response, NextFunction } from 'express';
import { ProjudiScraperService } from '../services/projudi-scraper.service';
import { ProcessoService } from '../services/processo.service';
import { AuthRequest } from '../types';
import { AuditService, AuditAction } from '../services/audit.service';
import { prisma } from 'database';

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
   * ESTRATEGIA 1 (SCRAPING): Inicia consulta para auto-cadastro (sem processo existente)
   */
  async iniciarCaptchaAutoCadastro(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { numeroProcesso } = req.body;
      const userId = req.user!.userId;

      if (!numeroProcesso) {
        return res.status(400).json({
          error: 'Número do processo é obrigatório'
        });
      }

      // Validar formato do número do processo (CNJ)
      const numeroLimpo = numeroProcesso.replace(/[^0-9]/g, '');
      if (numeroLimpo.length !== 20) {
        return res.status(400).json({
          error: 'Número do processo inválido. Use o formato CNJ com 20 dígitos.'
        });
      }

      // Validar se é processo do Paraná (tribunal = 16)
      // Formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
      // Sem formatação: posições 14-15 = tribunal
      const tribunal = numeroLimpo.substring(14, 16);
      if (tribunal !== '16') {
        return res.status(400).json({
          error: 'Consulta PROJUDI disponível apenas para processos do Paraná (tribunal 16)'
        });
      }

      // Iniciar consulta e obter CAPTCHA
      const resultado = await projudiScraperService.iniciarConsulta(
        numeroProcesso,
        userId
      );

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
      const processoAtualizado = await processoService.update(id, dadosAtualizacao, userId);

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

      // Salvar consulta PROJUDI com movimentações em JSON
      const consultaProjudi = await prisma.consultaProjudi.create({
        data: {
          processoId: id,
          metodo: 'SCRAPING_ASSISTIDO',
          status: 'SUCESSO',
          dadosExtraidos: dadosProjudi as any,
          movimentacoes: (dadosProjudi.movimentacoes || []) as any,
          userId,
          ipAddress: req.ip
        }
      });

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
        camposAtualizados: Object.keys(dadosAtualizacao),
        totalMovimentacoes: dadosProjudi.movimentacoes?.length || 0,
        consultaId: consultaProjudi.id
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
   * Conta quantas movimentações são novas comparando com consulta anterior
   */
  private contarNovasMovimentacoes(movimentacoesAtuais: any[], movimentacoesAnteriores: any[]): number {
    if (!Array.isArray(movimentacoesAtuais) || !Array.isArray(movimentacoesAnteriores)) {
      return 0;
    }

    // Criar set de IDs das movimentações antigas (usando sequencial + data como chave única)
    const movimentacoesAntigasSet = new Set(
      movimentacoesAnteriores.map(m =>
        `${m.sequencial || 0}_${m.data}_${m.evento}`
      )
    );

    // Contar quantas movimentações atuais não existiam antes
    return movimentacoesAtuais.filter(m =>
      !movimentacoesAntigasSet.has(`${m.sequencial || 0}_${m.data}_${m.evento}`)
    ).length;
  }

  /**
   * Mapeia tipo de parte do PROJUDI para enum do sistema
   */
  private mapearTipoParte(tipo: string): 'AUTOR' | 'REU' | 'TERCEIRO_INTERESSADO' | 'ASSISTENTE' | 'DENUNCIADO_LIDE' | 'CHAMADO_PROCESSO' {
    const tipoUpper = tipo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    // Polo ativo (autor)
    if (tipoUpper.includes('AUTOR') || tipoUpper.includes('REQUERENTE') || tipoUpper.includes('ATIVO') ||
        tipoUpper.includes('EXEQUENTE') || tipoUpper.includes('CREDOR')) {
      return 'AUTOR';
    }

    // Polo passivo (réu)
    if (tipoUpper.includes('REU') || tipoUpper.includes('REQUERIDO') || tipoUpper.includes('PASSIVO') ||
        tipoUpper.includes('EXECUTADO') || tipoUpper.includes('DEVEDOR')) {
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
   * Buscar movimentações do processo
   */
  async buscarMovimentacoes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Buscar todas as consultas PROJUDI bem-sucedidas do processo
      const consultas = await prisma.consultaProjudi.findMany({
        where: {
          processoId: id,
          status: 'SUCESSO'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Filtrar consultas que têm movimentações
      const consultaComMovimentacoes = consultas.find(c => c.movimentacoes !== null);

      if (!consultaComMovimentacoes || !consultaComMovimentacoes.movimentacoes) {
        return res.json({
          movimentacoes: [],
          total: 0,
          mensagem: 'Nenhuma movimentação encontrada. Faça uma consulta PROJUDI primeiro.'
        });
      }

      // Verificar se há consulta anterior para comparar
      const consultaAnterior = consultas.find((c, index) =>
        index > 0 && c.movimentacoes !== null
      );

      const totalNovas = consultaAnterior
        ? this.contarNovasMovimentacoes(
            consultaComMovimentacoes.movimentacoes as any,
            consultaAnterior.movimentacoes as any
          )
        : 0;

      res.json({
        movimentacoes: consultaComMovimentacoes.movimentacoes,
        total: Array.isArray(consultaComMovimentacoes.movimentacoes) ? consultaComMovimentacoes.movimentacoes.length : 0,
        dataConsulta: consultaComMovimentacoes.createdAt,
        dataConsultaAnterior: consultaAnterior?.createdAt || null,
        totalNovas: totalNovas
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Consultar PROJUDI para auto-cadastro (apenas extrai dados, não cadastra)
   */
  async consultarParaAutoCadastro(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId, captchaResposta } = req.body;
      const userId = req.user!.userId;

      if (!sessionId || !captchaResposta) {
        return res.status(400).json({
          erro: 'SessionId e resposta do CAPTCHA são obrigatórios'
        });
      }

      console.log('[AUTO-CADASTRO] Consultando PROJUDI...', { sessionId });

      // Consultar PROJUDI
      const dadosProjudi = await projudiScraperService.consultarComCaptcha(
        sessionId,
        captchaResposta,
        userId
      );

      console.log('[AUTO-CADASTRO] Dados extraídos:', {
        numero: dadosProjudi.numero,
        totalPartes: dadosProjudi.partes?.length || 0,
        totalMovimentacoes: dadosProjudi.movimentacoes?.length || 0
      });

      // DEBUG: Log detalhado das partes extraídas
      if (dadosProjudi.partes && dadosProjudi.partes.length > 0) {
        console.log('[AUTO-CADASTRO CONSULTA] Partes extraídas:');
        dadosProjudi.partes.forEach((p: any, idx: number) => {
          console.log(`  [${idx}] Nome: ${p.nome}, Tipo: "${p.tipo}", CPF: ${p.cpf || 'N/A'}`);
        });
      } else {
        console.log('[AUTO-CADASTRO CONSULTA] ⚠️ NENHUMA PARTE FOI EXTRAÍDA DO PROJUDI!');
        console.log('[AUTO-CADASTRO CONSULTA] Dados completos recebidos:', JSON.stringify(dadosProjudi, null, 2));
      }

      // Retorna APENAS os dados extraídos, sem cadastrar
      res.json({
        sucesso: true,
        dados: dadosProjudi
      });
    } catch (error: any) {
      console.error('[AUTO-CADASTRO] Erro na consulta:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });

      // Tratamento de erros específicos
      if (error.message?.includes('Processo') && error.message?.includes('encontr')) {
        return res.status(404).json({
          erro: 'Processo não encontrado no PROJUDI. Verifique o número do processo.',
          detalhes: error.message
        });
      }

      if (error.message?.includes('CAPTCHA')) {
        return res.status(400).json({
          erro: 'CAPTCHA inválido ou expirado. Tente novamente.',
          detalhes: error.message
        });
      }

      next(error);
    }
  }

  /**
   * Auto-cadastrar processo com CAPTCHA - Cria Cliente, Partes e Processo automaticamente
   */
  async autoCadastrarProcessoComCaptcha(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { dadosExtraidos } = req.body;
      const userId = req.user!.userId;

      if (!dadosExtraidos) {
        return res.status(400).json({
          erro: 'Dados extraídos do PROJUDI são obrigatórios'
        });
      }

      // Buscar advogado vinculado ao usuário
      const advogado = await prisma.advogado.findUnique({
        where: { userId }
      });

      if (!advogado) {
        return res.status(403).json({
          erro: 'Usuário não é um advogado'
        });
      }

      const advogadoId = advogado.id;
      const dadosProjudi = dadosExtraidos;

      console.log('[AUTO-CADASTRO] Cadastrando processo com dados extraídos:', {
        numero: dadosProjudi.numero,
        totalPartes: dadosProjudi.partes?.length || 0,
        totalMovimentacoes: dadosProjudi.movimentacoes?.length || 0
      });

      // DEBUG: Log detalhado das partes
      if (dadosProjudi.partes && dadosProjudi.partes.length > 0) {
        console.log('[AUTO-CADASTRO] Partes recebidas:');
        dadosProjudi.partes.forEach((p: any, idx: number) => {
          console.log(`  [${idx}] Nome: ${p.nome}, Tipo Original: "${p.tipo}", Tipo Mapeado: "${this.mapearTipoParte(p.tipo)}"`);
        });
      } else {
        console.log('[AUTO-CADASTRO] ⚠️ NENHUMA PARTE ENCONTRADA NOS DADOS EXTRAÍDOS!');
      }

      // 1. Criar ou buscar Cliente (primeira parte AUTOR/EXEQUENTE)
      const parteAutor = dadosProjudi.partes?.find((p: any) =>
        this.mapearTipoParte(p.tipo) === 'AUTOR'
      );

      console.log('[AUTO-CADASTRO] Parte AUTOR encontrada:', parteAutor ? parteAutor.nome : 'NENHUMA');

      let clienteId: string;
      let clienteExistente = null;

      if (parteAutor) {
        // Verificar se já existe cliente com esse CPF
        clienteExistente = parteAutor.cpf
          ? await prisma.cliente.findUnique({ where: { cpf: parteAutor.cpf } })
          : null;

        if (clienteExistente) {
          clienteId = clienteExistente.id;
        } else {
          // Criar novo cliente
          const bcrypt = require('bcrypt');
          const senhaHash = await bcrypt.hash('temporaria123', 10);

          const novoUsuario = await prisma.user.create({
            data: {
              nome: parteAutor.nome,
              email: `cliente_${Date.now()}@temp.com`, // Email temporário
              password: senhaHash, // Senha temporária hasheada
              role: 'CLIENTE'
            }
          });

          const novoCliente = await prisma.cliente.create({
            data: {
              userId: novoUsuario.id,
              tipoPessoa: parteAutor.cpf ? 'FISICA' : 'JURIDICA',
              cpf: parteAutor.cpf || null
            }
          });

          clienteId = novoCliente.id;
        }
      } else {
        return res.status(400).json({
          erro: 'Nenhuma parte AUTOR/EXEQUENTE encontrada para criar cliente'
        });
      }

      // 2. Criar Processo
      const dadosProcesso: any = {
        numero: dadosProjudi.numero,
        clienteId,
        advogadoId,
        dataInicio: new Date(),
        status: 'EM_ANDAMENTO'
      };

      // Preencher dados extraídos do PROJUDI
      if (dadosProjudi.comarca) dadosProcesso.comarca = dadosProjudi.comarca;
      if (dadosProjudi.vara) dadosProcesso.vara = dadosProjudi.vara;
      if (dadosProjudi.foro) dadosProcesso.foro = dadosProjudi.foro;
      if (dadosProjudi.dataDistribuicao) {
        try {
          const [dia, mes, ano] = dadosProjudi.dataDistribuicao.split('/');
          dadosProcesso.dataDistribuicao = new Date(`${ano}-${mes}-${dia}`);
        } catch (e) {
          console.error('Erro ao parsear data de distribuição:', e);
        }
      }
      if (dadosProjudi.valorCausa) dadosProcesso.valorCausa = dadosProjudi.valorCausa;
      if (dadosProjudi.objetoAcao) dadosProcesso.objetoAcao = dadosProjudi.objetoAcao;
      if (dadosProjudi.status) {
        // Mapear status do PROJUDI para enum do sistema
        if (dadosProjudi.status.toLowerCase().includes('tramitação')) {
          dadosProcesso.status = 'EM_ANDAMENTO';
        }
      }

      const processoNovo = await prisma.processo.create({
        data: dadosProcesso,
        include: {
          cliente: { include: { user: true } },
          advogado: { include: { user: true } }
        }
      });

      // 3. Criar ParteProcessual para todas as partes
      if (dadosProjudi.partes && dadosProjudi.partes.length > 0) {
        const partesMapeadas = dadosProjudi.partes.map((parte: any) => ({
          processoId: processoNovo.id,
          tipoParte: this.mapearTipoParte(parte.tipo),
          tipoPessoa: (parte.cpf ? 'FISICA' : 'JURIDICA') as 'FISICA' | 'JURIDICA',
          nomeCompleto: parte.nome,
          cpf: parte.cpf || null,
          // Vincular com cliente se for o autor
          clienteId: parte.nome === parteAutor?.nome ? clienteId : null
        }));

        await prisma.parteProcessual.createMany({
          data: partesMapeadas
        });
      }

      // 4. Salvar consulta PROJUDI
      await prisma.consultaProjudi.create({
        data: {
          processoId: processoNovo.id,
          metodo: 'SCRAPING_ASSISTIDO',
          status: 'SUCESSO',
          dadosExtraidos: dadosProjudi as any,
          movimentacoes: (dadosProjudi.movimentacoes || []) as any,
          userId,
          ipAddress: req.ip
        }
      });

      // 5. Registrar auditoria
      await AuditService.createLog({
        entityType: 'Processo',
        entityId: processoNovo.id,
        action: AuditAction.CREATED,
        userId,
        newValue: JSON.stringify({ ...processoNovo, fonte: 'AUTO_CADASTRO_PROJUDI' })
      });

      res.status(201).json({
        sucesso: true,
        processo: processoNovo,
        cliente: { id: clienteId, criado: !clienteExistente },
        totalPartes: dadosProjudi.partes?.length || 0,
        totalMovimentacoes: dadosProjudi.movimentacoes?.length || 0,
        mensagem: 'Processo cadastrado automaticamente com sucesso!'
      });
    } catch (error: any) {
      console.error('[AUTO-CADASTRO] Erro detalhado:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3),
        numeroProcesso: req.body.numeroProcesso
      });

      // Tratamento de erros específicos
      if (error.message?.includes('Processo') && error.message?.includes('encontr')) {
        return res.status(404).json({
          erro: 'Processo não encontrado no PROJUDI. Verifique o número do processo.',
          detalhes: error.message
        });
      }

      if (error.message?.includes('CAPTCHA')) {
        return res.status(400).json({
          erro: 'CAPTCHA inválido ou expirado. Tente novamente.',
          detalhes: error.message
        });
      }

      next(error);
    }
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
