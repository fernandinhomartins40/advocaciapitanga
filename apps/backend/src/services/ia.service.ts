import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export class IAService {
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
  }): Promise<string> {
    try {
      const systemPrompt = this.getPromptByTipo(data.tipoPeca);

      const userPrompt = `
        Elabore ${data.tipoPeca.toLowerCase()} com base nas seguintes informações:

        CONTEXTO:
        ${data.contexto}

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

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
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

      throw new Error('Erro ao gerar peça jurídica com IA');
    }
  }

  async analisarDocumento(conteudo: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
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
