import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { existsSync } from 'fs';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

interface SessionData {
  browser: Browser;
  page: Page;
  context: BrowserContext;
  timestamp: number;
  numeroProcesso: string;
}

interface ConsultaRegistro {
  ultimaConsulta: number;
  janelaInicio: number;
  totalJanela: number;
}

interface DadosProcessoProjudi {
  numero?: string;
  comarca?: string;
  vara?: string;
  foro?: string;
  status?: string;
  dataDistribuicao?: string;
  valorCausa?: string;
  objetoAcao?: string;
  partes?: Array<{
    tipo: string;
    nome: string;
    cpf?: string;
  }>;
  movimentacoes?: Array<{
    sequencial?: number;
    data: string;
    evento: string;
    descricao?: string;
    movimentadoPor?: string;
    tipoMovimento?: string;
  }>;
}

export class ProjudiScraperService {
  private sessions: Map<string, SessionData>;
  private consultas: Map<string, ConsultaRegistro>;
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutos
  private readonly DELAY_ENTRE_CONSULTAS = 3000; // 3 segundos (reduzido de 5)
  private readonly MAX_CONSULTAS_DIA = 100; // Aumentado de 50 para 100

  constructor() {
    this.sessions = new Map();
    this.consultas = new Map();

    // Limpar sessões expiradas a cada 5 minutos
    setInterval(() => this.limparSessoesExpiradas(), 5 * 60 * 1000);
  }

  /**
   * Normaliza o número do processo para o formato CNJ
   * Remove caracteres não numéricos e adiciona formatação
   */
  private normalizarNumeroProcesso(numero: string): string {
    // Remove tudo exceto dígitos
    const apenasNumeros = numero.replace(/\D/g, '');

    // Verifica se tem 20 dígitos (formato CNJ)
    if (apenasNumeros.length !== 20) {
      throw new Error('Número do processo deve conter exatamente 20 dígitos');
    }

    // Formata: NNNNNNN-DD.AAAA.J.TT.OOOO
    return `${apenasNumeros.slice(0, 7)}-${apenasNumeros.slice(7, 9)}.${apenasNumeros.slice(9, 13)}.${apenasNumeros.slice(13, 14)}.${apenasNumeros.slice(14, 16)}.${apenasNumeros.slice(16, 20)}`;
  }

  /**
   * Valida formato CNJ do número do processo
   */
  validarNumeroProcesso(numero: string): boolean {
    // Remove tudo exceto dígitos para validar
    const apenasNumeros = numero.replace(/\D/g, '');

    // Deve ter exatamente 20 dígitos
    if (apenasNumeros.length !== 20) {
      return false;
    }

    // Formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
    const regexCNJ = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;

    // Tenta normalizar e validar
    try {
      const numeroFormatado = this.normalizarNumeroProcesso(numero);
      return regexCNJ.test(numeroFormatado);
    } catch {
      return false;
    }
  }

  /**
   * Valida uso responsável (rate limiting)
   */
  private validarUsoResponsavel(userId: string): void {
    const agora = Date.now();
    const janela24h = 24 * 60 * 60 * 1000;

    const registroAtual = this.consultas.get(userId) || {
      ultimaConsulta: 0,
      janelaInicio: agora,
      totalJanela: 0
    };

    // Delay entre chamadas
    if (registroAtual.ultimaConsulta && agora - registroAtual.ultimaConsulta < this.DELAY_ENTRE_CONSULTAS) {
      const tempoRestante = Math.ceil((this.DELAY_ENTRE_CONSULTAS - (agora - registroAtual.ultimaConsulta)) / 1000);
      throw new Error(`Aguarde ${tempoRestante} segundos antes de fazer nova consulta`);
    }

    // Reset janela se passou 24h
    if (agora - registroAtual.janelaInicio > janela24h) {
      registroAtual.janelaInicio = agora;
      registroAtual.totalJanela = 0;
    }

    if (registroAtual.totalJanela >= this.MAX_CONSULTAS_DIA) {
      throw new Error('Limite diário de consultas atingido');
    }

    registroAtual.totalJanela += 1;
    registroAtual.ultimaConsulta = agora;

    this.consultas.set(userId, registroAtual);
  }

  /**
   * Limpa sessões expiradas
   */
  private limparSessoesExpiradas(): void {
    const agora = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (agora - session.timestamp > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }

    // Limpa histórico de consultas com janela expirada (mantém mapas enxutos)
    for (const [userId, registro] of this.consultas.entries()) {
      if (agora - registro.janelaInicio > 2 * 24 * 60 * 60 * 1000) {
        this.consultas.delete(userId);
      }
    }
  }


  /**
   * FASE 1: Inicia consulta e captura CAPTCHA
   */
  async iniciarConsulta(numeroProcesso: string, userId: string): Promise<{
    sessionId: string;
    captchaImage: string;
    numeroProcesso: string;
  }> {
    // Validações
    if (!this.validarNumeroProcesso(numeroProcesso)) {
      throw new Error('Número de processo inválido. Use o formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO');
    }

    // Normaliza o número do processo para o formato CNJ correto
    const numeroFormatado = this.normalizarNumeroProcesso(numeroProcesso);

    this.validarUsoResponsavel(userId);

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      // Iniciar browser headless com Playwright
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-tools',
          '--no-zygote',
          '--single-process',
          '--disable-breakpad',
          '--disable-crash-reporter',
          '--no-crash-upload',
          '--disable-features=VizDisplayCompositor',
          '--temp-dir=/tmp'
        ],
        timeout: 30000
      });

      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();

      // Navegar para consulta pública
      await page.goto('https://consulta.tjpr.jus.br/projudi_consulta/processo/consultaPublica.do?actionType=iniciar', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // DEBUG: Capturar screenshot e HTML para diagnóstico
      const htmlContent = await page.content();
      console.log('[PROJUDI DEBUG] HTML length:', htmlContent.length);
      console.log('[PROJUDI DEBUG] Contains "captcha":', htmlContent.toLowerCase().includes('captcha'));
      console.log('[PROJUDI DEBUG] URL:', page.url());

      // Buscar todos os elementos que possam ser o CAPTCHA
      const possibleSelectors = [
        '#captchaImage',  // Seletor correto do PROJUDI
        '#captchaImg',    // Fallback para versões antigas
        'img[src*="captcha"]',
        'img[id*="captcha"]',
        'img[alt*="captcha"]'
      ];

      let captchaElement = null;
      let usedSelector = '';

      for (const selector of possibleSelectors) {
        const count = await page.locator(selector).count();
        console.log(`[PROJUDI DEBUG] Selector "${selector}" count:`, count);

        if (count > 0) {
          captchaElement = page.locator(selector).first();
          usedSelector = selector;
          console.log(`[PROJUDI DEBUG] Found CAPTCHA with selector: ${selector}`);
          break;
        }
      }

      if (!captchaElement) {
        // Tentar encontrar qualquer imagem e logar para debug
        const allImages = await page.locator('img').count();
        console.log(`[PROJUDI DEBUG] Total images on page: ${allImages}`);

        // Capturar HTML snippet com "captcha"
        const captchaRegex = /<[^>]*captcha[^>]*>/gi;
        const matches = htmlContent.match(captchaRegex);
        console.log('[PROJUDI DEBUG] Elements with "captcha":', matches ? matches.slice(0, 3) : 'none');

        throw new Error('CAPTCHA não encontrado na página com nenhum seletor');
      }

      // Aguardar elemento estar visível
      await captchaElement.waitFor({ state: 'visible', timeout: 10000 });

      // Capturar screenshot do CAPTCHA
      const captchaBase64 = await captchaElement.screenshot({ type: 'png' });
      const captchaBase64String = captchaBase64.toString('base64');
      console.log(`[PROJUDI DEBUG] CAPTCHA screenshot captured, size: ${captchaBase64String.length} chars`);

      // Gerar ID único da sessão
      const sessionId = uuidv4();

      // Armazenar sessão com browser, page e context abertos
      this.sessions.set(sessionId, {
        browser,
        page,
        context,
        timestamp: Date.now(),
        numeroProcesso: numeroFormatado
      });

      // NÃO fechar o navegador - vai ser usado na fase 2
      console.log('[PROJUDI SESSION] Navegador mantido aberto para sessão:', sessionId);

      return {
        sessionId,
        captchaImage: `data:image/png;base64,${captchaBase64String}`,
        numeroProcesso: numeroFormatado
      };
    } catch (error: any) {
      if (browser) {
        await browser.close();
      }
      throw new Error(`Erro ao acessar PROJUDI: ${error.message}`);
    }
  }

  /**
   * FASE 2: Consulta com CAPTCHA resolvido pelo usuário
   */
  async consultarComCaptcha(
    sessionId: string,
    captchaResposta: string,
    userId: string
  ): Promise<DadosProcessoProjudi> {
    // Recuperar sessão
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Sessão expirada ou inválida. Tente novamente.');
    }

    // Verificar timeout
    const agora = Date.now();
    if (agora - session.timestamp > this.SESSION_TIMEOUT) {
      // Fechar navegador antes de deletar sessão
      await session.browser.close();
      this.sessions.delete(sessionId);
      throw new Error('Sessão expirada. Tente novamente.');
    }

    // Usar browser e page da sessão existente
    const { browser, page } = session;

    try {
      console.log('[PROJUDI SESSION] Usando navegador da sessão:', sessionId);

      // Preencher formulário - usa o número normalizado (campo já deve estar visível)
      await page.waitForSelector('#numeroProcesso', { timeout: 10000 });
      await page.fill('#numeroProcesso', session.numeroProcesso);

      // Preencher resposta do CAPTCHA (case-sensitive, não converter para maiúsculas)
      await page.waitForSelector('input[name="answer"]', { timeout: 10000 });
      await page.fill('input[name="answer"]', captchaResposta);

      // Aguardar um pouco para garantir que os campos foram preenchidos
      await page.waitForTimeout(500);

      // Submeter formulário usando JavaScript submit() em vez de clicar no botão
      console.log('[PROJUDI SUBMIT] Submetendo formulário...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        page.evaluate(() => {
          // @ts-ignore - document is available in browser context
          const form = document.querySelector('form');
          if (form) {
            // @ts-ignore - form.submit() is valid in browser
            form.submit();
          }
        })
      ]);

      // Verificar se CAPTCHA foi aceito
      const urlAtual = page.url();
      const conteudoPagina = await page.content();

      console.log('[PROJUDI SUBMIT] URL após submit:', urlAtual);
      console.log('[PROJUDI SUBMIT] HTML length após submit:', conteudoPagina.length);
      console.log('[PROJUDI SUBMIT] Contém "captcha inválido":', conteudoPagina.includes('captcha inválido'));
      console.log('[PROJUDI SUBMIT] Contém "Processo não encontrado":', conteudoPagina.includes('Processo não encontrado'));
      console.log('[PROJUDI SUBMIT] Contém "Consulta Pública":', conteudoPagina.includes('Consulta Pública'));

      // Salvar HTML para debug (primeiros 2000 chars)
      const htmlPreview = conteudoPagina.substring(0, 2000);
      console.log('[PROJUDI SUBMIT] HTML preview:', htmlPreview);

      // Verificar erros comuns
      if (conteudoPagina.includes('captcha inválido') ||
          conteudoPagina.includes('código de segurança incorreto')) {
        await browser.close();
        this.sessions.delete(sessionId);
        throw new Error('CAPTCHA incorreto. Tente novamente.');
      }

      if (conteudoPagina.includes('Processo não encontrado') ||
          conteudoPagina.includes('Nenhum processo encontrado')) {
        await browser.close();
        this.sessions.delete(sessionId);
        throw new Error('Processo não encontrado no PROJUDI');
      }

      // Extrair dados da página
      const dadosProcesso = await this.extrairDadosProcesso(page);

      // Fechar navegador
      await browser.close();

      // Limpar sessão
      this.sessions.delete(sessionId);

      return dadosProcesso;
    } catch (error: any) {
      // Fechar navegador se ainda estiver aberto
      const session = this.sessions.get(sessionId);
      if (session?.browser) {
        try {
          await session.browser.close();
        } catch (e) {
          console.error('Erro ao fechar navegador:', e);
        }
      }
      this.sessions.delete(sessionId);
      throw new Error(`Erro na consulta: ${error.message}`);
    }
  }

  /**
   * Extrai dados da página de resultado
   */
  private async extrairDadosProcesso(page: Page): Promise<DadosProcessoProjudi> {
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('[PROJUDI EXTRACT] Iniciando extração de dados');
    console.log('[PROJUDI EXTRACT] HTML length:', html.length);

    const dados: DadosProcessoProjudi = {
      partes: [],
      movimentacoes: []
    };

    try {
      // Número do processo (do <h3>)
      const numeroTexto = $('h3').first().text().trim();
      console.log('[PROJUDI EXTRACT] H3 texto:', numeroTexto);
      const numeroMatch = numeroTexto.match(/Processo\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
      if (numeroMatch) {
        dados.numero = numeroMatch[1];
        console.log('[PROJUDI EXTRACT] Número extraído:', dados.numero);
      }

      // Contar tabelas .form
      const tableForms = $('table.form');
      console.log('[PROJUDI EXTRACT] Tabelas com classe .form encontradas:', tableForms.length);

      // Extrair dados da tabela .form usando labels
      $('table.form tr').each((i, row) => {
        const label = $(row).find('td.label, td.labelRadio').text().trim().replace(':', '');
        const valor = $(row).find('td:not(.label):not(.labelRadio)').first().text().trim();

        if (!label || !valor) return;

        console.log(`[PROJUDI EXTRACT] Label: "${label}" | Valor: "${valor}"`);

        switch (label.toLowerCase()) {
          case 'comarca':
            dados.comarca = valor;
            console.log('[PROJUDI EXTRACT] ✓ Comarca atribuída:', valor);
            break;
          case 'juízo':
            dados.vara = valor;
            console.log('[PROJUDI EXTRACT] ✓ Vara atribuída:', valor);
            break;
          case 'competência':
            if (!dados.foro) dados.foro = valor;
            break;
          case 'distribuição':
            const dataMatch = valor.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dataMatch) dados.dataDistribuicao = dataMatch[1];
            break;
          case 'juiz':
            // Pode armazenar se necessário
            break;
        }
      });

      // Classe Processual e Assunto
      $('table.form tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const label = cells.eq(0).text().trim().replace(':', '');
          const valor = cells.eq(1).text().trim();

          if (label === 'Classe Processual' && valor) {
            // Extrair apenas o nome da classe
            const classeMatch = valor.match(/\d+\s+-\s+(.+)/);
            if (classeMatch) {
              if (!dados.objetoAcao) dados.objetoAcao = classeMatch[1];
            }
          }

          if (label === 'Assunto Principal' && valor) {
            const assuntoMatch = valor.match(/\d+\s+-\s+(.+)/);
            if (assuntoMatch && !dados.objetoAcao) {
              dados.objetoAcao = assuntoMatch[1];
            }
          }
        }
      });

      // Status (extrair dos dias em tramitação)
      const statusMatch = numeroTexto.match(/\((\d+)\s+dia\(s\)\s+em\s+tramitação\)/);
      if (statusMatch) {
        dados.status = `Em tramitação (${statusMatch[1]} dias)`;
      }

      // Partes processuais - Exequente, Executado, Terceiros
      const secoes = ['Exequente', 'Executado', 'Terceiros'];

      secoes.forEach(secao => {
        // Procurar o <h4> com o nome da seção
        $('h4').each((i, h4Elem) => {
          const h4Text = $(h4Elem).text().trim();
          if (h4Text === secao) {
            // Encontrar a tabela seguinte
            const tabela = $(h4Elem).nextAll('table.resultTable').first();

            // Extrair partes da tabela
            tabela.find('tbody tr').each((j, row) => {
              const cells = $(row).find('td');
              if (cells.length >= 3) {
                const nomeCompleto = cells.eq(0).text().trim();

                // Limpar nome (remover quebras de linha extras)
                const nome = nomeCompleto.replace(/\s+/g, ' ').trim();

                if (nome && nome.length > 3) {
                  dados.partes?.push({
                    tipo: secao,
                    nome: nome,
                    cpf: undefined
                  });
                }
              }
            });
          }
        });
      });

      // Movimentações (extrair TODAS, não apenas 10)
      $('table.resultTable#idTableMovimentacoesmov1Grau1 tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const sequencial = cells.eq(1).text().trim(); // Coluna "Seq."
          const data = cells.eq(2).text().trim(); // Coluna "Data"
          const evento = cells.eq(3).text().trim(); // Coluna "Evento"
          const movimentadoPor = cells.eq(4).text().trim(); // Coluna "Movimentado por"

          if (data && evento) {
            // Extrair apenas o nome do evento (em negrito)
            const eventoElement = cells.eq(3);
            const eventoNome = eventoElement.find('b').first().text().trim();
            const eventoDescricao = eventoElement.text().replace(eventoNome, '').trim();

            // Determinar tipo de movimento baseado no ID da linha
            const rowId = $(row).attr('id') || '';
            let tipoMovimento = 'OUTROS';
            if (rowId.includes('JUIZ')) tipoMovimento = 'JUIZ';
            else if (rowId.includes('SERVIDOR')) tipoMovimento = 'SERVIDOR';
            else if (rowId.includes('ADVOGADO')) tipoMovimento = 'ADVOGADO';
            else if (rowId.includes('PROMOTOR')) tipoMovimento = 'PROMOTOR';
            else if (rowId.includes('DEFENSOR')) tipoMovimento = 'DEFENSOR';
            else if (rowId.includes('PROCURADOR')) tipoMovimento = 'PROCURADOR';
            else if (rowId.includes('AUDIENCIA')) tipoMovimento = 'AUDIENCIA';

            dados.movimentacoes?.push({
              sequencial: sequencial ? parseInt(sequencial) : undefined,
              data,
              evento: eventoNome || evento.substring(0, 200),
              descricao: eventoDescricao || evento,
              movimentadoPor: movimentadoPor || undefined,
              tipoMovimento
            });
          }
        }
      });

    } catch (error: any) {
      console.error('Erro ao extrair dados:', error);
      // Continua mesmo com erros parciais
    }

    console.log('[PROJUDI EXTRACT] Extração concluída');
    console.log('[PROJUDI EXTRACT] Dados extraídos:', JSON.stringify({
      numero: dados.numero,
      comarca: dados.comarca,
      vara: dados.vara,
      foro: dados.foro,
      status: dados.status,
      totalPartes: dados.partes?.length || 0,
      totalMovimentacoes: dados.movimentacoes?.length || 0
    }));

    return dados;
  }

  /**
   * Mapeia status do PROJUDI para enum do sistema
   */
  mapearStatus(statusProjudi: string): string {
    const statusLower = statusProjudi.toLowerCase();

    if (statusLower.includes('andamento') || statusLower.includes('ativo')) {
      return 'EM_ANDAMENTO';
    }
    if (statusLower.includes('suspenso')) {
      return 'SUSPENSO';
    }
    if (statusLower.includes('concluído') || statusLower.includes('concluido') ||
        statusLower.includes('finalizado')) {
      return 'CONCLUIDO';
    }
    if (statusLower.includes('arquivado')) {
      return 'ARQUIVADO';
    }

    return 'EM_ANDAMENTO'; // Default
  }

  /**
   * Parse valor monetário
   */
  parseValor(valorStr: string): number | null {
    if (!valorStr) return null;

    try {
      // Remove tudo exceto números, vírgula e ponto
      const valorLimpo = valorStr.replace(/[^\d,\.]/g, '');
      // Substitui vírgula por ponto
      const valorFormatado = valorLimpo.replace(',', '.');
      const valor = parseFloat(valorFormatado);
      return isNaN(valor) ? null : valor;
    } catch {
      return null;
    }
  }

  /**
   * Limpa cache de consultas antigas
   */
  limparCacheConsultas(): void {
    const agora = Date.now();
    const umDiaAtras = agora - 24 * 60 * 60 * 1000;

    for (const [userId, registro] of this.consultas.entries()) {
      if (registro.janelaInicio < umDiaAtras) {
        this.consultas.delete(userId);
      }
    }
  }

  /**
   * Reseta o limite de consultas de um usuário específico
   * Útil para desenvolvimento ou resolver bloqueios temporários
   */
  resetarLimiteUsuario(userId: string): void {
    this.consultas.delete(userId);
  }

  /**
   * Obtém informações do limite atual de um usuário
   */
  obterInfoLimite(userId: string): {
    consultasRestantes: number;
    tempoAteProximaConsulta: number;
    totalConsultasHoje: number;
  } {
    const agora = Date.now();
    const registro = this.consultas.get(userId);

    if (!registro) {
      return {
        consultasRestantes: this.MAX_CONSULTAS_DIA,
        tempoAteProximaConsulta: 0,
        totalConsultasHoje: 0
      };
    }

    const tempoDesdeUltimaConsulta = agora - registro.ultimaConsulta;
    const tempoAteProxima = Math.max(0, this.DELAY_ENTRE_CONSULTAS - tempoDesdeUltimaConsulta);

    // Reset janela se passou 24h
    const janela24h = 24 * 60 * 60 * 1000;
    if (agora - registro.janelaInicio > janela24h) {
      return {
        consultasRestantes: this.MAX_CONSULTAS_DIA,
        tempoAteProximaConsulta: 0,
        totalConsultasHoje: 0
      };
    }

    return {
      consultasRestantes: Math.max(0, this.MAX_CONSULTAS_DIA - registro.totalJanela),
      tempoAteProximaConsulta: Math.ceil(tempoAteProxima / 1000),
      totalConsultasHoje: registro.totalJanela
    };
  }
}
