import { Response, NextFunction } from 'express';
import { ProjudiScraperService } from '../services/projudi-scraper.service';
import { ProcessoService } from '../services/processo.service';
import { AuthRequest } from '../types';
import { AuditService, AuditAction } from '../services/audit.service';
import { prisma } from 'database';
import { hashPassword } from '../utils/bcrypt';

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
      if (dadosProjudi.dataAutuacao) {
        try {
          const [dia, mes, ano] = dadosProjudi.dataAutuacao.split('/');
          dadosAtualizacao.dataAutuacao = new Date(`${ano}-${mes}-${dia}`);
          console.log('[CONSULTA PROJUDI] ✓ Data de autuação atualizada:', dadosAtualizacao.dataAutuacao);
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
      if (dadosProjudi.tipoAcao) {
        dadosAtualizacao.tipoAcao = dadosProjudi.tipoAcao;
        console.log('[CONSULTA PROJUDI] ✓ Tipo de ação atualizado:', dadosProjudi.tipoAcao);
      }
      if (dadosProjudi.areaDireito) {
        dadosAtualizacao.areaDireito = dadosProjudi.areaDireito;
        console.log('[CONSULTA PROJUDI] ✓ Área do direito atualizada:', dadosProjudi.areaDireito);
      }
      if (dadosProjudi.justica) {
        dadosAtualizacao.justica = dadosProjudi.justica;
        console.log('[CONSULTA PROJUDI] ✓ Justiça atualizada:', dadosProjudi.justica);
      }
      if (dadosProjudi.instancia) {
        dadosAtualizacao.instancia = dadosProjudi.instancia;
        console.log('[CONSULTA PROJUDI] ✓ Instância atualizada:', dadosProjudi.instancia);
      }
      if (dadosProjudi.uf) {
        dadosAtualizacao.uf = dadosProjudi.uf;
        console.log('[CONSULTA PROJUDI] ✓ UF atualizada:', dadosProjudi.uf);
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

    // Polo ativo (autor) - inclui todos os tipos que iniciam ação/recurso
    if (tipoUpper.includes('AUTOR') || tipoUpper.includes('REQUERENTE') || tipoUpper.includes('ATIVO') ||
        tipoUpper.includes('EXEQUENTE') || tipoUpper.includes('CREDOR') || tipoUpper.includes('EMBARGANTE') ||
        tipoUpper.includes('APELANTE') || tipoUpper.includes('AGRAVANTE') || tipoUpper.includes('RECORRENTE')) {
      return 'AUTOR';
    }

    // Polo passivo (réu) - inclui todos os tipos contra quem se move a ação/recurso
    if (tipoUpper.includes('REU') || tipoUpper.includes('REQUERIDO') || tipoUpper.includes('PASSIVO') ||
        tipoUpper.includes('EXECUTADO') || tipoUpper.includes('DEVEDOR') || tipoUpper.includes('EMBARGADO') ||
        tipoUpper.includes('APELADO') || tipoUpper.includes('AGRAVADO') || tipoUpper.includes('RECORRIDO')) {
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

      // Log da resposta antes de enviar ao frontend
      console.log('[CONTROLLER] ===== RESPOSTA PARA FRONTEND =====');
      console.log('[CONTROLLER] Estrutura:', {
        sucesso: true,
        dados: {
          numero: dadosProjudi.numero,
          totalPartes: dadosProjudi.partes?.length || 0,
          primeirasPartes: dadosProjudi.partes?.slice(0, 3).map((p: any) => ({
            nome: p.nome,
            tipo: p.tipo
          }))
        }
      });
      console.log('[CONTROLLER] Dados completos sendo enviados:', JSON.stringify({
        ...dadosProjudi,
        movimentacoes: `[${dadosProjudi.movimentacoes?.length || 0} movimentações]` // Não logar todas
      }, null, 2));
      console.log('[CONTROLLER] =====================================');

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
   * LÓGICA: Igual à consulta normal do PROJUDI que já funciona
   * 1. Extrair primeira parte AUTOR/EXEQUENTE
   * 2. Criar cliente com dados mínimos (nome + email temporário)
   * 3. Criar processo vinculado ao cliente
   * 4. Criar partes processuais
   * 5. Importar movimentações
   */
  async autoCadastrarProcessoComCaptcha(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { dadosExtraidos, clienteId: clienteIdFrontend } = req.body;
      const userId = req.user!.userId;

      if (!dadosExtraidos) {
        return res.status(400).json({
          erro: 'Dados extraídos do PROJUDI são obrigatórios'
        });
      }

      const dadosProjudi = dadosExtraidos;

      console.log('[AUTO-CADASTRO] Iniciando cadastro automático:', {
        numero: dadosProjudi.numero,
        totalPartes: dadosProjudi.partes?.length || 0,
        totalMovimentacoes: dadosProjudi.movimentacoes?.length || 0,
        clienteIdRecebido: clienteIdFrontend || 'nenhum (criar novo)'
      });

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

      // PASSO 2: Determinar Cliente (usar existente ou criar novo)
      let clienteId: string;
      let clienteExistente = null;
      let clienteCriado = false;
      let nomeClienteVinculado = '';

      if (clienteIdFrontend) {
        // Frontend enviou um clienteId - usar cliente existente
        console.log('[AUTO-CADASTRO] ✓ Usando cliente existente fornecido pelo frontend:', clienteIdFrontend);

        // Verificar se o cliente realmente existe
        const clienteValidado = await prisma.cliente.findUnique({
          where: { id: clienteIdFrontend },
          include: { user: true }
        });

        if (!clienteValidado) {
          return res.status(400).json({
            erro: 'Cliente informado não existe'
          });
        }

        clienteId = clienteIdFrontend;
        clienteExistente = clienteValidado;
        nomeClienteVinculado = clienteValidado.user.nome;
        console.log('[AUTO-CADASTRO] Cliente vinculado:', clienteValidado.user.nome);
      } else {
        // Frontend não enviou clienteId - buscar/criar baseado nas partes
        console.log('[AUTO-CADASTRO] Nenhum clienteId fornecido, buscando parte AUTOR/EXEQUENTE...');

        let primeiraParteAutor: any = null;

        if (dadosProjudi.partes && dadosProjudi.partes.length > 0) {
          // Procurar por parte do polo ativo (AUTOR, EXEQUENTE, REQUERENTE)
          primeiraParteAutor = dadosProjudi.partes.find((p: any) => {
            const tipoMapeado = this.mapearTipoParte(p.tipo);
            console.log(`[AUTO-CADASTRO] - Parte: "${p.nome}" | Tipo: "${p.tipo}" | Mapeado: "${tipoMapeado}"`);
            return tipoMapeado === 'AUTOR';
          });
        }

        if (!primeiraParteAutor) {
          console.error('[AUTO-CADASTRO] ❌ Nenhuma parte AUTOR encontrada!');
          console.error('[AUTO-CADASTRO] Partes disponíveis:',
            dadosProjudi.partes?.map((p: any) => `"${p.nome}" (${p.tipo})`));

          return res.status(400).json({
            erro: 'Nenhuma parte AUTOR/EXEQUENTE/REQUERENTE encontrada nos dados extraídos. O processo precisa ter ao menos uma parte do polo ativo para criar o cliente.',
            partesEncontradas: dadosProjudi.partes?.map((p: any) => ({
              nome: p.nome,
              tipo: p.tipo
            }))
          });
        }

        console.log('[AUTO-CADASTRO] ✓ Primeira parte AUTOR identificada:', primeiraParteAutor.nome);

        // Verificar se já existe cliente com esse nome (busca por nome completo)
        const clientesPorNome = await prisma.cliente.findMany({
          where: {
            user: {
              nome: {
                equals: primeiraParteAutor.nome,
                mode: 'insensitive'
              }
            }
          },
          include: {
            user: true
          }
        });

        if (clientesPorNome.length > 0) {
          clienteExistente = clientesPorNome[0];
          clienteId = clienteExistente.id;
          nomeClienteVinculado = clienteExistente.user.nome;
          console.log('[AUTO-CADASTRO] ✓ Cliente existente encontrado:', clienteExistente.user.nome);
        } else {
          // Criar novo cliente com dados mínimos
          console.log('[AUTO-CADASTRO] Criando novo cliente:', primeiraParteAutor.nome);

          const timestamp = Date.now();
          const emailTemp = `cliente_${timestamp}@temp.advocacia.com`;
          const senhaTemp = await hashPassword(`temp${timestamp}`);

          const novoUsuario = await prisma.user.create({
            data: {
              nome: primeiraParteAutor.nome,
              email: emailTemp,
              password: senhaTemp,
              role: 'CLIENTE'
            }
          });

          const novoCliente = await prisma.cliente.create({
            data: {
              userId: novoUsuario.id,
              tipoPessoa: primeiraParteAutor.cpf ? 'FISICA' : 'JURIDICA',
              cpf: primeiraParteAutor.cpf || null
            }
          });

          clienteId = novoCliente.id;
          clienteCriado = true;
          nomeClienteVinculado = novoUsuario.nome;
          console.log('[AUTO-CADASTRO] ✓ Novo cliente criado:', novoUsuario.nome);
        }
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
      if (dadosProjudi.dataAutuacao) {
        try {
          const [dia, mes, ano] = dadosProjudi.dataAutuacao.split('/');
          dadosProcesso.dataAutuacao = new Date(`${ano}-${mes}-${dia}`);
          console.log('[AUTO-CADASTRO] ✓ Data de autuação definida:', dadosProcesso.dataAutuacao);
        } catch (e) {
          console.error('Erro ao parsear data de autuação:', e);
        }
      }
      if (dadosProjudi.valorCausa) dadosProcesso.valorCausa = dadosProjudi.valorCausa;
      if (dadosProjudi.objetoAcao) dadosProcesso.objetoAcao = dadosProjudi.objetoAcao;
      if (dadosProjudi.tipoAcao) {
        dadosProcesso.tipoAcao = dadosProjudi.tipoAcao;
        console.log('[AUTO-CADASTRO] ✓ Tipo de ação definido:', dadosProjudi.tipoAcao);
      }
      if (dadosProjudi.areaDireito) {
        dadosProcesso.areaDireito = dadosProjudi.areaDireito;
        console.log('[AUTO-CADASTRO] ✓ Área do direito definida:', dadosProjudi.areaDireito);
      }
      if (dadosProjudi.justica) {
        dadosProcesso.justica = dadosProjudi.justica;
        console.log('[AUTO-CADASTRO] ✓ Justiça definida:', dadosProjudi.justica);
      }
      if (dadosProjudi.instancia) {
        dadosProcesso.instancia = dadosProjudi.instancia;
        console.log('[AUTO-CADASTRO] ✓ Instância definida:', dadosProjudi.instancia);
      }
      if (dadosProjudi.uf) {
        dadosProcesso.uf = dadosProjudi.uf;
        console.log('[AUTO-CADASTRO] ✓ UF definida:', dadosProjudi.uf);
      }
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

      // PASSO 3: Criar ParteProcessual para TODAS as partes extraídas
      console.log('[AUTO-CADASTRO] Criando partes processuais...');

      if (dadosProjudi.partes && dadosProjudi.partes.length > 0) {
        const partesMapeadas = dadosProjudi.partes.map((parte: any) => {
          const tipoMapeado = this.mapearTipoParte(parte.tipo);
          const ehClienteAutor = parte.nome === nomeClienteVinculado;

          console.log(`[AUTO-CADASTRO] - Criando parte: "${parte.nome}" | Tipo: ${tipoMapeado} | É cliente: ${ehClienteAutor}`);

          return {
            processoId: processoNovo.id,
            tipoParte: tipoMapeado,
            tipoPessoa: (parte.cpf ? 'FISICA' : 'JURIDICA') as 'FISICA' | 'JURIDICA',
            nomeCompleto: parte.nome,
            cpf: parte.cpf || null,
            // Vincular com cliente se for a primeira parte AUTOR
            clienteId: ehClienteAutor ? clienteId : null
          };
        });

        await prisma.parteProcessual.createMany({
          data: partesMapeadas
        });

        console.log(`[AUTO-CADASTRO] ✓ ${partesMapeadas.length} parte(s) processual(is) criada(s)`);
      }

      console.log('[AUTO-CADASTRO] ✓ Processo criado:', processoNovo.numero);

      // PASSO 4: Salvar consulta PROJUDI no histórico
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

      console.log('[AUTO-CADASTRO] ✓ Consulta PROJUDI salva no histórico');

      // PASSO 5: Registrar auditoria
      await AuditService.createLog({
        entityType: 'Processo',
        entityId: processoNovo.id,
        action: AuditAction.CREATED,
        userId,
        newValue: JSON.stringify({ ...processoNovo, fonte: 'AUTO_CADASTRO_PROJUDI' })
      });

      console.log('[AUTO-CADASTRO] ✓ Auditoria registrada');
      console.log('[AUTO-CADASTRO] ========================================');
      console.log('[AUTO-CADASTRO] ✅ AUTO-CADASTRO CONCLUÍDO COM SUCESSO!');
      console.log('[AUTO-CADASTRO] ========================================');
      console.log(`[AUTO-CADASTRO] Processo: ${processoNovo.numero}`);
      console.log(`[AUTO-CADASTRO] Cliente: ${clienteCriado ? 'CRIADO' : 'EXISTENTE'} - ID: ${clienteId}`);
      console.log(`[AUTO-CADASTRO] Partes: ${dadosProjudi.partes?.length || 0}`);
      console.log(`[AUTO-CADASTRO] Movimentações: ${dadosProjudi.movimentacoes?.length || 0}`);

      res.status(201).json({
        sucesso: true,
        processo: processoNovo,
        cliente: {
          id: clienteId,
          criado: clienteCriado,
          nome: nomeClienteVinculado
        },
        totalPartes: dadosProjudi.partes?.length || 0,
        totalMovimentacoes: dadosProjudi.movimentacoes?.length || 0,
        mensagem: `Processo cadastrado automaticamente com sucesso! ${clienteCriado ? 'Cliente criado.' : 'Cliente existente vinculado.'}`
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
