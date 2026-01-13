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
    documentos?: Array<{
      numeroDocumento: string;        // Ex: "285.1"
      tipoArquivo: string;            // Ex: "Despacho"
      assinatura?: string;            // Ex: "PARANA TRIBUNAL DE JUSTICA:77821841000194 (Gabriel Ribeiro de Souza Lima)"
      nivelAcesso?: string;           // Ex: "Público", "Sigiloso"
      versoes: Array<{
        titulo: string;               // Ex: "Versão assinada", "Versão original"
        url: string;
      }>;
    }>;
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

      // Verificar URL atual antes de preencher
      console.log('[PROJUDI FILL] URL atual:', page.url());

      // Preencher formulário - usa o número normalizado (campo já deve estar visível)
      await page.waitForSelector('#numeroProcesso', { timeout: 10000 });
      await page.fill('#numeroProcesso', session.numeroProcesso);
      console.log('[PROJUDI FILL] Número preenchido:', session.numeroProcesso);

      // Preencher resposta do CAPTCHA (case-sensitive, não converter para maiúsculas)
      await page.waitForSelector('input[name="answer"]', { timeout: 10000 });
      await page.fill('input[name="answer"]', captchaResposta);
      console.log('[PROJUDI FILL] CAPTCHA preenchido:', captchaResposta);

      // Verificar valores preenchidos
      const numeroValue = await page.inputValue('#numeroProcesso');
      const captchaValue = await page.inputValue('input[name="answer"]');
      console.log('[PROJUDI FILL] Valor em #numeroProcesso:', numeroValue);
      console.log('[PROJUDI FILL] Valor em input[name="answer"]:', captchaValue);

      // Aguardar um pouco para garantir que os campos foram preenchidos
      await page.waitForTimeout(500);

      // Submeter formulário usando JavaScript submit() em vez de clicar no botão
      console.log('[PROJUDI SUBMIT] Submetendo formulário...');

      // Verificar se form existe e logar seus dados
      const formInfo = await page.evaluate(() => {
        // @ts-ignore
        const form = document.querySelector('form');
        if (!form) return { found: false };

        // @ts-ignore
        const formData = new FormData(form);
        const data: any = {};
        // @ts-ignore
        for (let [key, value] of formData.entries()) {
          data[key] = value;
        }

        return {
          found: true,
          action: form.action,
          method: form.method,
          data
        };
      });

      console.log('[PROJUDI SUBMIT] Form info:', JSON.stringify(formInfo));

      // Clicar no botão "Pesquisar" ao invés de fazer form.submit()
      // Isso garante que eventos onclick do botão sejam executados
      console.log('[PROJUDI SUBMIT] Clicando no botão Pesquisar...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        page.click('input[type="submit"][value="Pesquisar"]')
      ]);

      // Verificar se CAPTCHA foi aceito
      const urlAtual = page.url();
      const conteudoPagina = await page.content();

      console.log('[PROJUDI SUBMIT] URL após submit:', urlAtual);
      console.log('[PROJUDI SUBMIT] HTML length após submit:', conteudoPagina.length);

      // Capturar screenshot após submit para debug
      try {
        const screenshot = await page.screenshot({ fullPage: false, type: 'png' });
        const screenshotBase64 = screenshot.toString('base64');
        console.log('[PROJUDI SUBMIT] Screenshot após submit (primeiros 100 chars):', screenshotBase64.substring(0, 100));
      } catch (e) {
        console.log('[PROJUDI SUBMIT] Erro ao capturar screenshot:', e);
      }

      console.log('[PROJUDI SUBMIT] Contém "captcha inválido":', conteudoPagina.includes('captcha inválido'));
      console.log('[PROJUDI SUBMIT] Contém "Processo não encontrado":', conteudoPagina.includes('Processo não encontrado'));
      console.log('[PROJUDI SUBMIT] Contém "Consulta Pública":', conteudoPagina.includes('Consulta Pública'));

      // Procurar por mensagens de erro
      console.log('[PROJUDI SUBMIT] Contém "erro":', conteudoPagina.toLowerCase().includes('erro'));
      console.log('[PROJUDI SUBMIT] Contém "inválido":', conteudoPagina.toLowerCase().includes('inválido'));
      console.log('[PROJUDI SUBMIT] Contém "incorreto":', conteudoPagina.toLowerCase().includes('incorreto'));

      // Verificar indicadores de página de resultado
      console.log('[PROJUDI SUBMIT] Contém "Comarca":', conteudoPagina.includes('Comarca'));
      console.log('[PROJUDI SUBMIT] Contém "Juízo":', conteudoPagina.includes('Juízo') || conteudoPagina.includes('Juizo'));
      console.log('[PROJUDI SUBMIT] Contém "Dados do Processo":', conteudoPagina.includes('Dados do Processo'));

      // Verificar se há H3 com número de processo (indicador de resultado)
      const $temp = cheerio.load(conteudoPagina);
      const h3Text = $temp('h3').first().text();
      console.log('[PROJUDI SUBMIT] H3 na página:', h3Text.substring(0, 100));

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
    // IMPORTANTE: Expandir todas as movimentações que têm documentos
    // Os documentos são carregados via JavaScript quando o usuário clica no ícone "+"
    console.log('[PROJUDI EXTRACT] Expandindo movimentações com documentos...');

    try {
      // Encontrar todos os ícones de expansão (links com classe linkArquivosmovimentacoes)
      const icones = await page.$$('a[class^="linkArquivosmovimentacoes"]');
      console.log(`[PROJUDI EXTRACT] Encontrados ${icones.length} ícones de expansão`);

      // Clicar em cada ícone para expandir os documentos
      for (let i = 0; i < icones.length; i++) {
        try {
          await icones[i].click();
          // Aguardar um pouco para o conteúdo carregar
          await page.waitForTimeout(200);
        } catch (e: any) {
          console.log(`[PROJUDI EXTRACT] Erro ao clicar no ícone ${i}:`, e?.message || e);
        }
      }

      console.log('[PROJUDI EXTRACT] Expansão concluída, aguardando carregamento...');
      await page.waitForTimeout(1000);
    } catch (error: any) {
      console.log('[PROJUDI EXTRACT] Erro ao expandir movimentações:', error?.message || error);
    }

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
        const labelCell = $(row).find('td.label, td.labelRadio');
        const valueCell = $(row).find('td:not(.label):not(.labelRadio)').first();

        let label = labelCell.text().trim().replace(/:/g, '');
        let valor = valueCell.text().trim();

        // Se label está vazio, pode ser que label e valor estejam na mesma célula
        if (!label) {
          const rowText = $(row).text().trim();
          console.log(`[PROJUDI EXTRACT] Row text completo: "${rowText.substring(0, 100)}"`);
          return;
        }

        if (!valor) return;

        console.log(`[PROJUDI EXTRACT] Label: "${label}" | Valor: "${valor.substring(0, 100)}"`);

        // Extrair a primeira palavra do label para matching (ignora texto concatenado)
        const firstWord = label.split(/\s+/)[0].toLowerCase();

        switch (firstWord) {
          case 'comarca':
            dados.comarca = valor;
            console.log('[PROJUDI EXTRACT] ✓ Comarca atribuída:', valor);
            break;
          case 'juízo':
          case 'juizo':
            dados.vara = valor;
            console.log('[PROJUDI EXTRACT] ✓ Vara atribuída:', valor);
            break;
          case 'competência':
          case 'competencia':
            if (!dados.foro) dados.foro = valor;
            break;
          case 'distribuição':
          case 'distribuicao':
            const dataMatch = valor.match(/(\d{4}-\d{2}-\d{2})/);
            if (dataMatch) {
              // Converter de YYYY-MM-DD para DD/MM/YYYY
              const [ano, mes, dia] = dataMatch[1].split('-');
              dados.dataDistribuicao = `${dia}/${mes}/${ano}`;
              console.log('[PROJUDI EXTRACT] ✓ Data distribuição atribuída:', dados.dataDistribuicao);
            }
            break;
          case 'autuação':
          case 'autuacao':
            // Extrair data de autuação se necessário
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

      // Partes processuais - Todos os tipos possíveis
      const secoes = [
        'Autor', 'Réu',                   // Processos de conhecimento
        'Exequente', 'Executado',         // Processos de execução
        'Embargante', 'Embargado',        // Embargos
        'Apelante', 'Apelado',            // Apelações
        'Agravante', 'Agravado',          // Agravos
        'Recorrente', 'Recorrido',        // Recursos em geral
        'Requerente', 'Requerido',        // Procedimentos especiais
        'Terceiros', 'Terceiro Interessado', // Terceiros
        'Assistente', 'Denunciado à Lide', 'Chamado ao Processo'  // Outros
      ];

      // DEBUG: Log de todos os h4 encontrados
      console.log('[PROJUDI EXTRACT] Buscando seções de partes...');
      const h4sEncontrados: string[] = [];
      $('h4').each((i, h4Elem) => {
        h4sEncontrados.push($(h4Elem).text().trim());
      });
      console.log('[PROJUDI EXTRACT] Tags <h4> encontradas:', h4sEncontrados);

      secoes.forEach(secao => {
        // Procurar o <h4> com o nome da seção
        $('h4').each((i, h4Elem) => {
          const h4Text = $(h4Elem).text().trim();
          if (h4Text === secao) {
            console.log(`[PROJUDI EXTRACT] ✓ Seção "${secao}" encontrada`);
            // Encontrar a tabela seguinte
            const tabela = $(h4Elem).nextAll('table.resultTable').first();

            if (tabela.length === 0) {
              console.log(`[PROJUDI EXTRACT] ⚠️ Nenhuma tabela encontrada após seção "${secao}"`);
              return;
            }

            // Extrair partes da tabela
            let partesNaSecao = 0;
            tabela.find('tbody tr').each((j, row) => {
              const cells = $(row).find('td');
              console.log(`[PROJUDI EXTRACT] Processando linha ${j} da seção "${secao}": ${cells.length} células`);

              if (cells.length >= 3) {
                const nomeCompleto = cells.eq(0).text().trim();

                // Limpar nome (remover quebras de linha extras)
                const nome = nomeCompleto.replace(/\s+/g, ' ').trim();
                console.log(`[PROJUDI EXTRACT] Nome extraído: "${nome}" (comprimento: ${nome.length})`);

                if (nome && nome.length > 3) {
                  dados.partes?.push({
                    tipo: secao,
                    nome: nome,
                    cpf: undefined
                  });
                  console.log(`[PROJUDI EXTRACT] ✓ Parte adicionada ao array: ${dados.partes?.length || 0} total`);
                  partesNaSecao++;
                }
              }
            });
            console.log(`[PROJUDI EXTRACT] "${secao}": ${partesNaSecao} parte(s) extraída(s)`);
          }
        });
      });

      // Movimentações (extrair TODAS, não apenas 10)
      const rowsMovimentacoes = $('table.resultTable#idTableMovimentacoesmov1Grau1 tbody tr').toArray();

      for (let i = 0; i < rowsMovimentacoes.length; i++) {
        const row = rowsMovimentacoes[i];
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

            // Extrair documentos da movimentação
            // Documentos estão na próxima linha dentro de uma div expandida
            const documentos: Array<{
              numeroDocumento: string;
              tipoArquivo: string;
              assinatura?: string;
              nivelAcesso?: string;
              versoes: Array<{ titulo: string; url: string }>;
            }> = [];

            // Procurar na próxima linha por div de arquivos
            if (i + 1 < rowsMovimentacoes.length) {
              const nextRow = rowsMovimentacoes[i + 1];
              const divArquivos = $(nextRow).find('div[id^="divArquivosMovimentacaoProcesso"]');

              console.log(`[PROJUDI EXTRACT] Mov #${sequencial}: divs de arquivos encontradas = ${divArquivos.length}`);

              if (divArquivos.length > 0) {
                const tableForms = divArquivos.find('table.form');
                const trs = tableForms.find('tbody > tr');
                console.log(`[PROJUDI EXTRACT] Mov #${sequencial}: table.form = ${tableForms.length}, TRs = ${trs.length}`);

                // Cada documento está em uma <tr> dentro de table.form
                divArquivos.find('table.form > tbody > tr').each((docIndex, docRow) => {
                  const $docRow = $(docRow);
                  const cells = $docRow.find('td');

                  // Célula 1: Número do documento e tipo de arquivo
                  // Ex: "285.1 Arquivo: Despacho"
                  const celula1 = cells.eq(0).text().trim();
                  const numeroMatch = celula1.match(/^([\d.]+)/);
                  const tipoMatch = celula1.match(/Arquivo:\s*(.+)$/);

                  if (!numeroMatch) {
                    return; // Não é uma linha de documento
                  }

                  const numeroDocumento = numeroMatch[1].trim();
                  const tipoArquivo = tipoMatch ? tipoMatch[1].trim() : 'Documento';

                  // Célula 2: Assinatura
                  // Ex: "Ass.: PARANA TRIBUNAL DE JUSTICA:77821841000194 (Gabriel Ribeiro de Souza Lima)"
                  let assinatura: string | undefined;
                  if (cells.length > 2) {
                    const celulaAss = cells.eq(2).text().trim();
                    if (celulaAss.startsWith('Ass.:')) {
                      assinatura = celulaAss.replace('Ass.:', '').trim();
                    }
                  }

                  // Célula 3: Links para download (versões)
                  const versoes: Array<{ titulo: string; url: string }> = [];

                  if (cells.length > 4) {
                    const celulaLinks = cells.eq(4);

                    // Extrair versões do menu contextual (Versão assinada, Versão original)
                    celulaLinks.find('table.contextMenu tr[onclick*="arquivo.do"]').each((vIndex, vRow) => {
                      const $vRow = $(vRow);
                      const onclickAttr = $vRow.attr('onclick') || '';

                      // Extrair URL: post('/projudi_consulta/arquivo.do?_tj=...', '_blank')
                      const urlMatch = onclickAttr.match(/post\(['"]([^'"]+)['"]/);
                      if (urlMatch && urlMatch[1]) {
                        const url = urlMatch[1];
                        const titulo = $vRow.find('td').first().text().trim();

                        if (url && titulo) {
                          // Converter URL relativa para absoluta
                          let urlCompleta = url.startsWith('/')
                            ? `https://consulta.tjpr.jus.br${url}`
                            : url;

                          versoes.push({ titulo, url: urlCompleta });
                        }
                      }
                    });
                  }

                  // Célula 4: Nível de acesso (última coluna)
                  // Ex: "Público", "Sigiloso"
                  let nivelAcesso: string | undefined;
                  if (cells.length > 5) {
                    nivelAcesso = cells.eq(5).text().trim();
                  }

                  // Adicionar documento se tiver pelo menos uma versão
                  if (versoes.length > 0) {
                    documentos.push({
                      numeroDocumento,
                      tipoArquivo,
                      assinatura,
                      nivelAcesso,
                      versoes
                    });
                  }
                });
              }
            }

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

            // Log para debug de documentos
            if (documentos.length > 0) {
              console.log(`[PROJUDI DOCS] Movimentação #${sequencial} tem ${documentos.length} documento(s):`);
              documentos.forEach(doc => {
                console.log(`  - ${doc.numeroDocumento} - ${doc.tipoArquivo} (${doc.versoes.length} versões)`);
                console.log(`    Assinatura: ${doc.assinatura || 'N/A'}`);
                console.log(`    Nível: ${doc.nivelAcesso || 'N/A'}`);
                doc.versoes.forEach(v => console.log(`    → ${v.titulo}`));
              });
            }

            dados.movimentacoes?.push({
              sequencial: sequencial ? parseInt(sequencial) : undefined,
              data,
              evento: eventoNome || evento.substring(0, 200),
              descricao: eventoDescricao || evento,
              movimentadoPor: movimentadoPor || undefined,
              tipoMovimento,
              documentos: documentos.length > 0 ? documentos : undefined
            });
          }
        }
      }

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

    // Log detalhado de todas as partes
    console.log('[PROJUDI EXTRACT] ===== PARTES FINAIS =====');
    console.log('[PROJUDI EXTRACT] Total de partes:', dados.partes?.length || 0);
    if (dados.partes && dados.partes.length > 0) {
      dados.partes.forEach((p: any, i: number) => {
        console.log(`[PROJUDI EXTRACT] Parte ${i}: "${p.nome}" | Tipo: "${p.tipo}"`);
      });
    } else {
      console.log('[PROJUDI EXTRACT] ⚠️ ARRAY DE PARTES VAZIO!');
    }
    console.log('[PROJUDI EXTRACT] ===========================');

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
