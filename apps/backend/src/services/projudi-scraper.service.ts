import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { existsSync } from 'fs';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

interface SessionData {
  cookies: any[];
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
    data: string;
    descricao: string;
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

      // Aguardar página carregar
      await page.waitForSelector('#captchaImg', { timeout: 10000 });

      // Capturar cookies da sessão
      const cookies = await context.cookies();

      // Extrair imagem CAPTCHA
      const captchaElement = await page.locator('#captchaImg');
      if (!(await captchaElement.count())) {
        throw new Error('CAPTCHA não encontrado na página');
      }

      const captchaBase64 = await captchaElement.screenshot({ type: 'png' });
      const captchaBase64String = captchaBase64.toString('base64');

      // Gerar ID único da sessão
      const sessionId = uuidv4();

      // Armazenar sessão com o número formatado
      this.sessions.set(sessionId, {
        cookies,
        timestamp: Date.now(),
        numeroProcesso: numeroFormatado
      });

      await browser.close();

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
      this.sessions.delete(sessionId);
      throw new Error('Sessão expirada. Tente novamente.');
    }

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
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

      // Restaurar cookies da sessão
      await context.addCookies(session.cookies);

      const page = await context.newPage();

      // Navegar para página de consulta
      await page.goto('https://consulta.tjpr.jus.br/projudi_consulta/processo/consultaPublica.do?actionType=iniciar', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Preencher formulário - usa o número normalizado
      await page.waitForSelector('#numeroProcesso', { timeout: 10000 });
      await page.fill('#numeroProcesso', session.numeroProcesso);

      await page.waitForSelector('#captcha', { timeout: 10000 });
      await page.fill('#captcha', captchaResposta.toUpperCase());

      // Submeter formulário
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        page.click('input[type="submit"]')
      ]);

      // Verificar se CAPTCHA foi aceito
      const urlAtual = page.url();
      const conteudoPagina = await page.content();

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

      await browser.close();

      // Limpar sessão
      this.sessions.delete(sessionId);

      return dadosProcesso;
    } catch (error: any) {
      if (browser) {
        await browser.close();
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

    const dados: DadosProcessoProjudi = {
      partes: [],
      movimentacoes: []
    };

    try {
      // Número do processo
      const numeroTexto = $('.processo-numero, .numero-processo, #numeroProcesso').first().text().trim();
      if (numeroTexto) dados.numero = numeroTexto;

      // Comarca
      const comarcaTexto = $('.comarca, .processo-comarca').first().text().trim();
      if (comarcaTexto) dados.comarca = comarcaTexto.replace('Comarca:', '').trim();

      // Vara
      const varaTexto = $('.vara, .processo-vara').first().text().trim();
      if (varaTexto) dados.vara = varaTexto.replace('Vara:', '').trim();

      // Foro
      const foroTexto = $('.foro, .processo-foro').first().text().trim();
      if (foroTexto) dados.foro = foroTexto.replace('Foro:', '').trim();

      // Status
      const statusTexto = $('.status, .processo-status, .situacao').first().text().trim();
      if (statusTexto) dados.status = statusTexto.replace('Status:', '').trim();

      // Data de distribuição
      const dataDistTexto = $('.data-distribuicao, .distribuicao').first().text().trim();
      if (dataDistTexto) {
        const dataMatch = dataDistTexto.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dataMatch) dados.dataDistribuicao = dataMatch[1];
      }

      // Valor da causa
      const valorCausaTexto = $('.valor-causa, .valorCausa').first().text().trim();
      if (valorCausaTexto) {
        dados.valorCausa = valorCausaTexto.replace(/[^\d,\.]/g, '');
      }

      // Objeto da ação
      const objetoTexto = $('.objeto-acao, .objetoAcao, .assunto').first().text().trim();
      if (objetoTexto) dados.objetoAcao = objetoTexto;

      // Partes processuais
      $('.parte, .parte-processual, tr[class*="parte"]').each((i, elem) => {
        const tipo = $(elem).find('.tipo-parte, td:first').text().trim();
        const nome = $(elem).find('.nome-parte, td:nth-child(2)').text().trim();
        const cpf = $(elem).find('.cpf-parte, .documento').text().trim();

        if (tipo && nome) {
          dados.partes?.push({
            tipo: tipo.replace(':', '').trim(),
            nome: nome.trim(),
            cpf: cpf || undefined
          });
        }
      });

      // Movimentações
      $('.movimentacao, .processo-movimentacao, tr[class*="movimentacao"]').slice(0, 10).each((i, elem) => {
        const data = $(elem).find('.data, .data-movimentacao, td:first').text().trim();
        const descricao = $(elem).find('.descricao, .texto-movimentacao, td:last').text().trim();

        if (data && descricao) {
          dados.movimentacoes?.push({
            data,
            descricao: descricao.substring(0, 500) // Limitar tamanho
          });
        }
      });

    } catch (error: any) {
      console.error('Erro ao extrair dados:', error);
      // Continua mesmo com erros parciais
    }

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
