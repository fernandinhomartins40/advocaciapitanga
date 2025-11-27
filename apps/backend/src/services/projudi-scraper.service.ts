import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

interface SessionData {
  cookies: any[];
  timestamp: number;
  numeroProcesso: string;
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
  private consultas: Map<string, number>;
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutos
  private readonly DELAY_ENTRE_CONSULTAS = 5000; // 5 segundos
  private readonly MAX_CONSULTAS_DIA = 50;

  constructor() {
    this.sessions = new Map();
    this.consultas = new Map();

    // Limpar sessões expiradas a cada 5 minutos
    setInterval(() => this.limparSessoesExpiradas(), 5 * 60 * 1000);
  }

  /**
   * Valida formato CNJ do número do processo
   */
  validarNumeroProcesso(numero: string): boolean {
    // Formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
    const regexCNJ = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;
    return regexCNJ.test(numero);
  }

  /**
   * Valida uso responsável (rate limiting)
   */
  private validarUsoResponsavel(userId: string): void {
    const ultimaConsulta = this.consultas.get(userId);
    const agora = Date.now();

    if (ultimaConsulta && agora - ultimaConsulta < this.DELAY_ENTRE_CONSULTAS) {
      const tempoRestante = Math.ceil((this.DELAY_ENTRE_CONSULTAS - (agora - ultimaConsulta)) / 1000);
      throw new Error(`Aguarde ${tempoRestante} segundos antes de fazer nova consulta`);
    }

    // Verificar limite diário (simplificado - seria melhor usar Redis)
    const consultasHoje = Array.from(this.consultas.entries())
      .filter(([_, timestamp]) => agora - timestamp < 24 * 60 * 60 * 1000)
      .length;

    if (consultasHoje >= this.MAX_CONSULTAS_DIA) {
      throw new Error('Limite diário de consultas atingido');
    }

    this.consultas.set(userId, agora);
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

    this.validarUsoResponsavel(userId);

    let browser: Browser | null = null;

    try {
      // Iniciar browser headless
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-tools',
          '--no-zygote',
          '--single-process',
          '--disable-crash-reporter'
        ]
      });

      const page = await browser.newPage();

      // Configurar user agent realista
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navegar para consulta pública
      await page.goto('https://consulta.tjpr.jus.br/projudi_consulta/processo/consultaPublica.do?actionType=iniciar', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Aguardar página carregar
      await page.waitForSelector('#captchaImg', { timeout: 10000 });

      // Capturar cookies da sessão
      const cookies = await page.cookies();

      // Extrair imagem CAPTCHA
      const captchaElement = await page.$('#captchaImg');
      if (!captchaElement) {
        throw new Error('CAPTCHA não encontrado na página');
      }

      const captchaBase64 = await captchaElement.screenshot({ encoding: 'base64' });

      // Gerar ID único da sessão
      const sessionId = uuidv4();

      // Armazenar sessão
      this.sessions.set(sessionId, {
        cookies,
        timestamp: Date.now(),
        numeroProcesso
      });

      await browser.close();

      return {
        sessionId,
        captchaImage: `data:image/png;base64,${captchaBase64}`,
        numeroProcesso
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

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-tools',
          '--no-zygote',
          '--single-process',
          '--disable-crash-reporter'
        ]
      });

      const page = await browser.newPage();

      // Configurar user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Restaurar cookies da sessão
      await page.setCookie(...session.cookies);

      // Navegar para página de consulta
      await page.goto('https://consulta.tjpr.jus.br/projudi_consulta/processo/consultaPublica.do?actionType=iniciar', {
        waitUntil: 'networkidle2'
      });

      // Preencher formulário
      await page.waitForSelector('#numeroProcesso');
      await page.type('#numeroProcesso', session.numeroProcesso);

      await page.waitForSelector('#captcha');
      await page.type('#captcha', captchaResposta.toUpperCase());

      // Submeter formulário
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
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

    for (const [userId, timestamp] of this.consultas.entries()) {
      if (timestamp < umDiaAtras) {
        this.consultas.delete(userId);
      }
    }
  }
}
