import * as soap from 'soap';
import { XMLParser } from 'fast-xml-parser';

interface ProjudiApiConfig {
  enabled: boolean;
  wsdlUrl: string;
  username?: string;
  password?: string;
  ambiente: 'producao' | 'homologacao';
}

interface DadosProcessoMNI {
  numeroProcesso?: string;
  classeProcessual?: string;
  assunto?: string;
  dataAjuizamento?: string;
  valorCausa?: number;
  orgaoJulgador?: {
    nome?: string;
    comarca?: string;
    instancia?: string;
  };
  partes?: Array<{
    polo?: string;
    nome?: string;
    cpfCnpj?: string;
  }>;
  movimentacoes?: Array<{
    dataHora?: string;
    descricao?: string;
    complemento?: string;
  }>;
}

export class ProjudiApiService {
  private config: ProjudiApiConfig;
  private soapClient: soap.Client | null = null;
  private xmlParser: XMLParser;

  constructor() {
    this.config = {
      enabled: process.env.PROJUDI_API_ENABLED === 'true',
      wsdlUrl: this.getWsdlUrl(),
      username: process.env.PROJUDI_USERNAME,
      password: process.env.PROJUDI_PASSWORD,
      ambiente: (process.env.PROJUDI_AMBIENTE as 'producao' | 'homologacao') || 'homologacao'
    };

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  /**
   * Retorna URL do WSDL baseado no ambiente
   */
  private getWsdlUrl(): string {
    const ambiente = process.env.PROJUDI_AMBIENTE || 'homologacao';
    const instancia = process.env.PROJUDI_INSTANCIA || 'primeira';

    if (ambiente === 'producao') {
      if (instancia === 'segunda') {
        return 'https://projudi.tjpr.jus.br/projudi_consulta/webservices/projudiIntercomunicacaoWebService2G222?wsdl';
      }
      return 'https://projudi.tjpr.jus.br/projudi_consulta/webservices/projudiIntercomunicacaoWebService222?wsdl';
    } else {
      // Homologação
      if (instancia === 'segunda') {
        return 'https://tst.tjpr.jus.br/projudi/webservices/projudiIntercomunicacaoWebService2G222?wsdl';
      }
      return 'https://tst.tjpr.jus.br/projudi/webservices/projudiIntercomunicacaoWebService222?wsdl';
    }
  }

  /**
   * Verifica se a API oficial está habilitada e configurada
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.username && !!this.config.password;
  }

  /**
   * Cria cliente SOAP
   */
  private async createSoapClient(): Promise<soap.Client> {
    if (this.soapClient) {
      return this.soapClient;
    }

    try {
      const client = await soap.createClientAsync(this.config.wsdlUrl, {
        wsdl_options: {
          timeout: 30000
        }
      });

      // Adicionar credenciais se necessário
      if (this.config.username && this.config.password) {
        client.setSecurity(
          new soap.BasicAuthSecurity(this.config.username, this.config.password)
        );
      }

      this.soapClient = client;
      return client;
    } catch (error: any) {
      throw new Error(`Erro ao conectar com API PROJUDI: ${error.message}`);
    }
  }

  /**
   * Consulta processo pela API oficial (MNI 2.2.2)
   */
  async consultarProcesso(numeroProcesso: string): Promise<DadosProcessoMNI> {
    if (!this.isEnabled()) {
      throw new Error('API PROJUDI não está habilitada. Configure as credenciais.');
    }

    try {
      const client = await this.createSoapClient();

      // Formatar número do processo (remover pontuação)
      const numeroFormatado = numeroProcesso.replace(/[^\d]/g, '');

      // Preparar request SOAP
      const soapRequest = {
        numeroProcesso: numeroFormatado,
        siglaTribunal: 'TJPR'
      };

      // Fazer chamada SOAP
      const [result] = await client.consultarProcessoAsync(soapRequest);

      if (!result) {
        throw new Error('Processo não encontrado');
      }

      // Parse XML response
      const dadosMNI = this.parseMNIResponse(result);

      return dadosMNI;
    } catch (error: any) {
      console.error('Erro na consulta SOAP:', error);
      throw new Error(`Erro ao consultar processo: ${error.message}`);
    }
  }

  /**
   * Consulta alterações do processo (hash)
   */
  async consultarAlteracao(numeroProcesso: string): Promise<{
    hash: string;
    temAlteracao: boolean;
  }> {
    if (!this.isEnabled()) {
      throw new Error('API PROJUDI não está habilitada');
    }

    try {
      const client = await this.createSoapClient();
      const numeroFormatado = numeroProcesso.replace(/[^\d]/g, '');

      const soapRequest = {
        numeroProcesso: numeroFormatado,
        siglaTribunal: 'TJPR'
      };

      const [result] = await client.consultarAlteracaoAsync(soapRequest);

      return {
        hash: result.hash || '',
        temAlteracao: result.temAlteracao || false
      };
    } catch (error: any) {
      throw new Error(`Erro ao verificar alterações: ${error.message}`);
    }
  }

  /**
   * Parse da resposta MNI (XML) para objeto
   */
  private parseMNIResponse(xmlResponse: any): DadosProcessoMNI {
    const dados: DadosProcessoMNI = {
      partes: [],
      movimentacoes: []
    };

    try {
      // Parse XML
      const parsed = typeof xmlResponse === 'string'
        ? this.xmlParser.parse(xmlResponse)
        : xmlResponse;

      // Extrair dados conforme estrutura MNI 2.2.2
      const processo = parsed.processo || parsed;

      // Dados básicos
      dados.numeroProcesso = processo.numeroProcesso || processo['@_numeroProcesso'];
      dados.classeProcessual = processo.classeProcessual?.['@_nome'] || processo.classe;
      dados.assunto = processo.assunto?.['@_nome'] || processo.assuntoProcesso;
      dados.dataAjuizamento = processo.dataAjuizamento || processo['@_dataAjuizamento'];

      // Valor da causa
      if (processo.valorCausa) {
        dados.valorCausa = parseFloat(processo.valorCausa.toString().replace(',', '.'));
      }

      // Órgão julgador
      if (processo.orgaoJulgador) {
        dados.orgaoJulgador = {
          nome: processo.orgaoJulgador.nome || processo.orgaoJulgador['@_nome'],
          comarca: processo.orgaoJulgador.comarca || processo.orgaoJulgador['@_comarca'],
          instancia: processo.orgaoJulgador.instancia || processo.orgaoJulgador['@_instancia']
        };
      }

      // Partes
      const partesArray = Array.isArray(processo.parte)
        ? processo.parte
        : processo.parte
          ? [processo.parte]
          : [];

      for (const parte of partesArray) {
        dados.partes?.push({
          polo: parte.polo || parte['@_polo'],
          nome: parte.nome || parte['@_nome'],
          cpfCnpj: parte.cpfCnpj || parte.documento || parte['@_documento']
        });
      }

      // Movimentações
      const movimentacoesArray = Array.isArray(processo.movimentacao)
        ? processo.movimentacao
        : processo.movimentacao
          ? [processo.movimentacao]
          : [];

      for (const mov of movimentacoesArray) {
        dados.movimentacoes?.push({
          dataHora: mov.dataHora || mov['@_dataHora'],
          descricao: mov.descricao || mov['@_descricao'] || mov.texto,
          complemento: mov.complemento || mov['@_complemento']
        });
      }

    } catch (error: any) {
      console.error('Erro ao fazer parse MNI:', error);
      // Retorna dados parciais mesmo com erro
    }

    return dados;
  }

  /**
   * Mapeia dados MNI para formato do sistema
   */
  mapearDadosMNI(dadosMNI: DadosProcessoMNI): any {
    const dados: any = {};

    // Mapeamento direto
    if (dadosMNI.numeroProcesso) {
      dados.numero = this.formatarNumeroCNJ(dadosMNI.numeroProcesso);
    }

    if (dadosMNI.dataAjuizamento) {
      try {
        dados.dataDistribuicao = new Date(dadosMNI.dataAjuizamento);
      } catch {
        // Ignora se data inválida
      }
    }

    if (dadosMNI.valorCausa) {
      dados.valorCausa = dadosMNI.valorCausa;
    }

    if (dadosMNI.assunto) {
      dados.objetoAcao = dadosMNI.assunto;
    }

    // Órgão julgador
    if (dadosMNI.orgaoJulgador) {
      if (dadosMNI.orgaoJulgador.comarca) {
        dados.comarca = dadosMNI.orgaoJulgador.comarca;
      }
      if (dadosMNI.orgaoJulgador.nome) {
        // Tentar extrair vara do nome
        dados.vara = dadosMNI.orgaoJulgador.nome;
      }
      if (dadosMNI.orgaoJulgador.instancia) {
        dados.instancia = this.mapearInstancia(dadosMNI.orgaoJulgador.instancia);
      }
    }

    // Partes processuais
    if (dadosMNI.partes && dadosMNI.partes.length > 0) {
      dados.partes = dadosMNI.partes.map(parte => ({
        tipoParte: this.mapearPolo(parte.polo),
        tipoPessoa: parte.cpfCnpj?.length === 11 ? 'FISICA' : 'JURIDICA',
        nomeCompleto: parte.nome,
        cpf: parte.cpfCnpj?.length === 11 ? parte.cpfCnpj : undefined,
        cnpj: parte.cpfCnpj?.length === 14 ? parte.cpfCnpj : undefined
      }));
    }

    return dados;
  }

  /**
   * Formata número CNJ
   */
  private formatarNumeroCNJ(numero: string): string {
    const numeros = numero.replace(/\D/g, '');
    if (numeros.length !== 20) return numero;

    return `${numeros.substring(0, 7)}-${numeros.substring(7, 9)}.${numeros.substring(9, 13)}.${numeros.substring(13, 14)}.${numeros.substring(14, 16)}.${numeros.substring(16, 20)}`;
  }

  /**
   * Mapeia polo para TipoParte
   */
  private mapearPolo(polo?: string): string {
    if (!polo) return 'TERCEIRO_INTERESSADO';

    const poloUpper = polo.toUpperCase();

    if (poloUpper.includes('ATIVO') || poloUpper.includes('AUTOR') || poloUpper.includes('REQUERENTE')) {
      return 'AUTOR';
    }
    if (poloUpper.includes('PASSIVO') || poloUpper.includes('RÉU') || poloUpper.includes('REU') || poloUpper.includes('REQUERIDO')) {
      return 'REU';
    }

    return 'TERCEIRO_INTERESSADO';
  }

  /**
   * Mapeia instância MNI para enum do sistema
   */
  private mapearInstancia(instancia?: string): string {
    if (!instancia) return 'PRIMEIRA';

    const instanciaUpper = instancia.toUpperCase();

    if (instanciaUpper.includes('PRIMEIRA') || instanciaUpper === '1') {
      return 'PRIMEIRA';
    }
    if (instanciaUpper.includes('SEGUNDA') || instanciaUpper === '2') {
      return 'SEGUNDA';
    }
    if (instanciaUpper.includes('SUPERIOR')) {
      return 'SUPERIOR';
    }
    if (instanciaUpper.includes('SUPREMO')) {
      return 'SUPREMO';
    }

    return 'PRIMEIRA';
  }

  /**
   * Testa conexão com a API
   */
  async testarConexao(): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      if (!this.isEnabled()) {
        return {
          sucesso: false,
          mensagem: 'API não está habilitada ou credenciais não configuradas'
        };
      }

      const client = await this.createSoapClient();

      // Verificar se cliente foi criado
      if (!client) {
        return {
          sucesso: false,
          mensagem: 'Não foi possível conectar ao serviço SOAP'
        };
      }

      return {
        sucesso: true,
        mensagem: 'Conexão estabelecida com sucesso'
      };
    } catch (error: any) {
      return {
        sucesso: false,
        mensagem: `Erro: ${error.message}`
      };
    }
  }
}
