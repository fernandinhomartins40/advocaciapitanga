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
      'Petição Inicial': `Você é um assistente jurídico especializado em elaborar petições iniciais.
        Crie uma petição inicial bem estruturada, formal e tecnicamente correta, seguindo as normas do CPC.
        Inclua: endereçamento ao juízo, qualificação das partes, dos fatos, do direito, dos pedidos e do valor da causa.`,

      'Contestação': `Você é um assistente jurídico especializado em contestações.
        Elabore uma contestação técnica e fundamentada, com preliminares (se aplicável) e mérito.
        Inclua impugnação específica aos fatos alegados e argumentação jurídica sólida.`,

      'Recurso': `Você é um assistente jurídico especializado em recursos.
        Elabore um recurso bem fundamentado, com razões de fato e de direito.
        Demonstre o erro ou injustiça da decisão recorrida.`,

      'Contrato': `Você é um assistente jurídico especializado em contratos.
        Elabore um contrato claro, objetivo e juridicamente seguro.
        Inclua todas as cláusulas essenciais e dispositivos de segurança jurídica.`,

      'Parecer': `Você é um assistente jurídico especializado em pareceres.
        Elabore um parecer técnico e fundamentado, com análise criteriosa da questão apresentada.
        Inclua relatório, fundamentação e conclusão.`,
    };

    return prompts[tipo] || `Você é um assistente jurídico especializado.
      Elabore um documento jurídico profissional e bem fundamentado.`;
  }

  async gerarPecaJuridica(data: {
    tipoPeca: string;
    contexto: string;
    fundamentosLegais?: string;
    pedidos?: string;
    partes?: string[];
    dadosCliente?: any;
    dadosProcesso?: any;
    templateBase?: string;
  }, advogadoId: string): Promise<string> {
    try {
      const openai = await this.getOpenAIClient(advogadoId);
      const modelo = await this.getModeloGPT(advogadoId);
      const systemPrompt = this.getPromptByTipo(data.tipoPeca);

      // Enriquecer prompt com dados do cliente e processo
      let dadosAdicionais = '';

      if (data.dadosCliente) {
        dadosAdicionais += `\n\nDADOS DO CLIENTE:\n`;
        dadosAdicionais += `Nome: ${data.dadosCliente.user.nome}\n`;
        dadosAdicionais += `Email: ${data.dadosCliente.user.email}\n`;
        if (data.dadosCliente.cpf) dadosAdicionais += `CPF: ${data.dadosCliente.cpf}\n`;
        if (data.dadosCliente.telefone) dadosAdicionais += `Telefone: ${data.dadosCliente.telefone}\n`;
        if (data.dadosCliente.endereco) dadosAdicionais += `Endereço: ${data.dadosCliente.endereco}\n`;
      }

      if (data.dadosProcesso) {
        dadosAdicionais += `\n\nDADOS DO PROCESSO:\n`;
        dadosAdicionais += `Número: ${data.dadosProcesso.numero}\n`;
        dadosAdicionais += `Descrição: ${data.dadosProcesso.descricao}\n`;
        dadosAdicionais += `Status: ${data.dadosProcesso.status}\n`;
        if (data.dadosProcesso.cliente) {
          dadosAdicionais += `Cliente do processo: ${data.dadosProcesso.cliente.user.nome}\n`;
        }
      }

      let userPrompt = '';

      // Se há template base, usar como referência
      if (data.templateBase) {
        userPrompt = `
        Elabore ${data.tipoPeca.toLowerCase()} usando o seguinte MODELO BASE como referência estrutural:

        === MODELO BASE ===
        ${data.templateBase}
        === FIM DO MODELO BASE ===

        Adapte e complete o modelo acima com base nas seguintes informações específicas:

        CONTEXTO:
        ${data.contexto}

        ${dadosAdicionais}

        ${data.partes && data.partes.length > 0 ? `
        PARTES ENVOLVIDAS:
        ${data.partes.join('\n')}
        ` : ''}

        ${data.fundamentosLegais ? `
        FUNDAMENTOS LEGAIS:
        ${data.fundamentosLegais}
        ` : ''}

        ${data.pedidos ? `
        PEDIDOS:
        ${data.pedidos}
        ` : ''}

        IMPORTANTE:
        - Mantenha a estrutura e o estilo do modelo base
        - Substitua as variáveis {{ }} pelos dados reais fornecidos
        - Adapte o conteúdo ao caso específico
        - Mantenha a formatação profissional e técnica
      `;
      } else {
        userPrompt = `
        Elabore ${data.tipoPeca.toLowerCase()} com base nas seguintes informações:

        CONTEXTO:
        ${data.contexto}

        ${dadosAdicionais}

        ${data.partes && data.partes.length > 0 ? `
        PARTES ENVOLVIDAS:
        ${data.partes.join('\n')}
        ` : ''}

        ${data.fundamentosLegais ? `
        FUNDAMENTOS LEGAIS:
        ${data.fundamentosLegais}
        ` : ''}

        ${data.pedidos ? `
        PEDIDOS:
        ${data.pedidos}
        ` : ''}

        Por favor, elabore o documento de forma profissional, técnica e completa.
        Use formatação adequada com parágrafos, seções e numeração quando apropriado.
      `;
      }

      const completion = await openai.chat.completions.create({
        model: modelo,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
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
