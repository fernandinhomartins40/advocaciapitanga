import OpenAI from 'openai';

export class IAService {
  private async getOpenAIClient(advogadoId: string): Promise<OpenAI> {
    const { prisma } = await import('database');

    const configuracao = await prisma.configuracaoIA.findUnique({
      where: { advogadoId }
    });

    // Usar API key do advogado se existir, senão usar do ambiente
    const apiKey = configuracao?.openaiApiKey || process.env.OPENAI_API_KEY || '';

    if (!apiKey) {
      throw new Error('API Key OpenAI não configurada. Configure em Configurações > IA');
    }

    return new OpenAI({ apiKey });
  }

  private async getModeloGPT(advogadoId: string): Promise<string> {
    const { prisma } = await import('database');

    const configuracao = await prisma.configuracaoIA.findUnique({
      where: { advogadoId }
    });

    return configuracao?.modeloGPT || 'gpt-4';
  }

  private getPromptByTipo(tipo: string): string {
    const prompts: Record<string, string> = {
      'Petição Inicial': 'Assistente jurídico. Elabore petição inicial conforme CPC: endereçamento, qualificação, fatos, direito, pedidos, valor.',
      'Contestação': 'Assistente jurídico. Elabore contestação: preliminares, mérito, impugnação específica aos fatos.',
      'Recurso': 'Assistente jurídico. Elabore recurso fundamentado demonstrando erro da decisão.',
      'Contrato': 'Assistente jurídico. Elabore contrato com cláusulas essenciais e segurança jurídica.',
      'Parecer': 'Assistente jurídico. Elabore parecer: relatório, fundamentação, conclusão.',
    };

    return prompts[tipo] || 'Assistente jurídico. Elabore documento profissional fundamentado.';
  }

  /**
   * Compacta dados removendo campos vazios e formatação desnecessária
   */
  private compactarDados(obj: any, campos: string[]): string {
    const resultado: string[] = [];
    for (const campo of campos) {
      const valor = obj[campo];
      if (valor && valor.toString().trim()) {
        // Formato compacto: campo:valor
        resultado.push(`${campo}:${valor}`);
      }
    }
    return resultado.join('|');
  }

  /**
   * Monta endereço compacto apenas se houver dados
   */
  private montarEnderecoCompacto(obj: any): string {
    const partes = [
      obj.logradouro,
      obj.numero ? `nº${obj.numero}` : null,
      obj.complemento,
      obj.bairro,
      obj.cidade,
      obj.uf,
      obj.cep ? `CEP:${obj.cep}` : null
    ].filter(Boolean);

    return partes.length > 0 ? partes.join(', ') : '';
  }

  async gerarPecaJuridica(data: {
    tipoPeca: string;
    contexto: string;
    fundamentosLegais?: string;
    pedidos?: string;
    partes?: string[];
    dadosCliente?: any;
    dadosProcesso?: any;
    dadosPartes?: any[];
    templateBase?: string;
  }, advogadoId: string): Promise<string> {
    try {
      const openai = await this.getOpenAIClient(advogadoId);
      const modelo = await this.getModeloGPT(advogadoId);
      const systemPrompt = this.getPromptByTipo(data.tipoPeca);

      // Montar dados compactos (redução de ~60% de tokens)
      const dados: string[] = [];

      // Cliente (formato compacto)
      if (data.dadosCliente) {
        const c = data.dadosCliente;
        const clienteInfo = [
          `Cliente:${c.user.nome}`,
          c.cpf ? `CPF:${c.cpf}` : null,
          c.rg ? `RG:${c.rg}` : null,
          c.nacionalidade ? `Nac:${c.nacionalidade}` : null,
          c.estadoCivil ? `Est.Civil:${c.estadoCivil}` : null,
          c.profissao ? `Prof:${c.profissao}` : null,
        ].filter(Boolean);

        const endCliente = this.montarEnderecoCompacto(c);
        if (endCliente) clienteInfo.push(`End:${endCliente}`);

        dados.push(clienteInfo.join('|'));
      }

      // Processo (formato compacto)
      if (data.dadosProcesso) {
        const p = data.dadosProcesso;
        const processoInfo = [
          `Processo:${p.numero}`,
          p.tipoAcao ? `Tipo:${p.tipoAcao}` : null,
          p.areaDireito ? `Área:${p.areaDireito}` : null,
          p.comarca ? `Comarca:${p.comarca}` : null,
          p.foro ? `Foro:${p.foro}` : null,
          p.vara ? `Vara:${p.vara}` : null,
          p.valorCausa ? `ValorCausa:R$${p.valorCausa}` : null,
        ].filter(Boolean);

        dados.push(processoInfo.join('|'));

        // Objetos e descrições à parte (podem ser longos)
        if (p.objetoAcao) dados.push(`Objeto:${p.objetoAcao}`);
        if (p.pedidoPrincipal) dados.push(`PedidoPrinc:${p.pedidoPrincipal}`);
      }

      // Partes (formato ultra-compacto)
      if (data.dadosPartes && data.dadosPartes.length > 0) {
        const autor = data.dadosPartes.find((p: any) => p.tipoParte === 'AUTOR');
        const reu = data.dadosPartes.find((p: any) => p.tipoParte === 'REU');
        const adv = data.dadosPartes.find((p: any) => p.tipoParte === 'ADVOGADO');

        if (autor) {
          const autorInfo = [
            `AUTOR:${autor.nomeCompleto}`,
            autor.cpf ? `CPF:${autor.cpf}` : null,
            autor.rg ? `RG:${autor.rg}` : null,
            autor.estadoCivil ? `Est:${autor.estadoCivil}` : null,
            autor.profissao ? `Prof:${autor.profissao}` : null,
          ].filter(Boolean);

          const endAutor = this.montarEnderecoCompacto(autor);
          if (endAutor) autorInfo.push(`End:${endAutor}`);

          dados.push(autorInfo.join('|'));
        }

        if (reu) {
          const reuInfo = [
            `RÉU:${reu.nomeCompleto}`,
            reu.tipoPessoa === 'FISICA' && reu.cpf ? `CPF:${reu.cpf}` : null,
            reu.tipoPessoa !== 'FISICA' && reu.cnpj ? `CNPJ:${reu.cnpj}` : null,
            reu.razaoSocial ? `Razão:${reu.razaoSocial}` : null,
          ].filter(Boolean);

          const endReu = this.montarEnderecoCompacto(reu);
          if (endReu) reuInfo.push(`End:${endReu}`);

          dados.push(reuInfo.join('|'));
        }

        if (adv) {
          dados.push(`ADV:${adv.nomeCompleto}|OAB:${adv.oab || 'N/A'}`);
        }
      }

      const dadosAdicionais = dados.join('\n');

      // Prompt otimizado (redução de ~50% de tokens)
      const userPrompt = `Modelo HTML:
${data.templateBase}

Dados (formato: campo:valor|campo:valor):
${dadosAdicionais}
${data.contexto ? `\nContexto: ${data.contexto}` : ''}
${data.fundamentosLegais ? `\nFundamentos: ${data.fundamentosLegais}` : ''}
${data.pedidos ? `\nPedidos: ${data.pedidos}` : ''}
${data.partes && data.partes.length > 0 ? `\nObs: ${data.partes.join('; ')}` : ''}

Instruções: Mantenha estrutura HTML. Substitua {{variáveis}} pelos dados. Enriqueça conteúdo jurídico.`;

      const completion = await openai.chat.completions.create({
        model: modelo,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5, // Reduzido de 0.7 (mais determinístico = menos tokens)
        max_tokens: 2500, // Limitar output (peças raramente > 2500 tokens)
      });

      const conteudo = completion.choices[0]?.message?.content || '';

      if (!conteudo) {
        throw new Error('Não foi possível gerar o conteúdo');
      }

      return conteudo;
    } catch (error: any) {
      console.error('Erro ao gerar peça jurídica:', error);

      if (error.status === 401) {
        throw new Error('Chave da API OpenAI inválida ou não configurada');
      }

      throw new Error('Erro ao gerar peça jurídica com IA: ' + (error.message || 'Erro desconhecido'));
    }
  }

  async analisarDocumento(conteudo: string, advogadoId: string): Promise<string> {
    try {
      const openai = await this.getOpenAIClient(advogadoId);
      const modelo = await this.getModeloGPT(advogadoId);

      const completion = await openai.chat.completions.create({
        model: modelo,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente jurídico especializado em análise de documentos. Forneça uma análise técnica e objetiva.'
          },
          {
            role: 'user',
            content: `Analise o seguinte documento jurídico e forneça um resumo executivo, pontos principais e possíveis questões jurídicas:\n\n${conteudo}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1500,
      });

      return completion.choices[0]?.message?.content || 'Não foi possível analisar o documento';
    } catch (error) {
      console.error('Erro ao analisar documento:', error);
      throw new Error('Erro ao analisar documento com IA');
    }
  }
}
