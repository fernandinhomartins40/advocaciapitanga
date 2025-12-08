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
    dadosPartes?: any[];
    templateBase?: string;
  }, advogadoId: string): Promise<string> {
    try {
      const openai = await this.getOpenAIClient(advogadoId);
      const modelo = await this.getModeloGPT(advogadoId);
      const systemPrompt = this.getPromptByTipo(data.tipoPeca);

      // Enriquecer prompt com dados do cliente, processo e partes
      let dadosAdicionais = '';

      if (data.dadosCliente) {
        dadosAdicionais += `\n\nDADOS DO CLIENTE:\n`;
        dadosAdicionais += `Nome: ${data.dadosCliente.user.nome}\n`;
        dadosAdicionais += `Email: ${data.dadosCliente.user.email}\n`;
        if (data.dadosCliente.cpf) dadosAdicionais += `CPF: ${data.dadosCliente.cpf}\n`;
        if (data.dadosCliente.rg) dadosAdicionais += `RG: ${data.dadosCliente.rg}\n`;
        if (data.dadosCliente.telefone) dadosAdicionais += `Telefone: ${data.dadosCliente.telefone}\n`;
        if (data.dadosCliente.nacionalidade) dadosAdicionais += `Nacionalidade: ${data.dadosCliente.nacionalidade}\n`;
        if (data.dadosCliente.estadoCivil) dadosAdicionais += `Estado Civil: ${data.dadosCliente.estadoCivil}\n`;
        if (data.dadosCliente.profissao) dadosAdicionais += `Profissão: ${data.dadosCliente.profissao}\n`;

        // Endereço completo
        const enderecoPartes = [];
        if (data.dadosCliente.logradouro) enderecoPartes.push(data.dadosCliente.logradouro);
        if (data.dadosCliente.numero) enderecoPartes.push(`nº ${data.dadosCliente.numero}`);
        if (data.dadosCliente.complemento) enderecoPartes.push(data.dadosCliente.complemento);
        if (data.dadosCliente.bairro) enderecoPartes.push(data.dadosCliente.bairro);
        if (data.dadosCliente.cidade) enderecoPartes.push(data.dadosCliente.cidade);
        if (data.dadosCliente.uf) enderecoPartes.push(data.dadosCliente.uf);
        if (data.dadosCliente.cep) enderecoPartes.push(`CEP: ${data.dadosCliente.cep}`);

        if (enderecoPartes.length > 0) {
          dadosAdicionais += `Endereço: ${enderecoPartes.join(', ')}\n`;
        }
      }

      if (data.dadosProcesso) {
        dadosAdicionais += `\n\nDADOS DO PROCESSO:\n`;
        dadosAdicionais += `Número: ${data.dadosProcesso.numero}\n`;
        if (data.dadosProcesso.tipoAcao) dadosAdicionais += `Tipo de Ação: ${data.dadosProcesso.tipoAcao}\n`;
        if (data.dadosProcesso.areaDireito) dadosAdicionais += `Área do Direito: ${data.dadosProcesso.areaDireito}\n`;
        if (data.dadosProcesso.comarca) dadosAdicionais += `Comarca: ${data.dadosProcesso.comarca}\n`;
        if (data.dadosProcesso.foro) dadosAdicionais += `Foro: ${data.dadosProcesso.foro}\n`;
        if (data.dadosProcesso.vara) dadosAdicionais += `Vara: ${data.dadosProcesso.vara}\n`;
        if (data.dadosProcesso.objetoAcao) dadosAdicionais += `Objeto da Ação: ${data.dadosProcesso.objetoAcao}\n`;
        if (data.dadosProcesso.pedidoPrincipal) dadosAdicionais += `Pedido Principal: ${data.dadosProcesso.pedidoPrincipal}\n`;
        if (data.dadosProcesso.valorCausa) dadosAdicionais += `Valor da Causa: R$ ${data.dadosProcesso.valorCausa}\n`;
        if (data.dadosProcesso.descricao) dadosAdicionais += `Descrição: ${data.dadosProcesso.descricao}\n`;
        if (data.dadosProcesso.status) dadosAdicionais += `Status: ${data.dadosProcesso.status}\n`;
      }

      // Adicionar dados das partes processuais
      if (data.dadosPartes && data.dadosPartes.length > 0) {
        dadosAdicionais += `\n\nPARTES PROCESSUAIS:\n`;

        const autor = data.dadosPartes.find((p: any) => p.tipoParte === 'AUTOR');
        const reu = data.dadosPartes.find((p: any) => p.tipoParte === 'REU');
        const advogado = data.dadosPartes.find((p: any) => p.tipoParte === 'ADVOGADO');

        if (autor) {
          dadosAdicionais += `\nAUTOR:\n`;
          dadosAdicionais += `Nome: ${autor.nomeCompleto}\n`;
          if (autor.cpf) dadosAdicionais += `CPF: ${autor.cpf}\n`;
          if (autor.rg) dadosAdicionais += `RG: ${autor.rg}${autor.orgaoEmissor ? ` - ${autor.orgaoEmissor}` : ''}\n`;
          if (autor.nacionalidade) dadosAdicionais += `Nacionalidade: ${autor.nacionalidade}\n`;
          if (autor.estadoCivil) dadosAdicionais += `Estado Civil: ${autor.estadoCivil}\n`;
          if (autor.profissao) dadosAdicionais += `Profissão: ${autor.profissao}\n`;

          const enderecoAutor = [];
          if (autor.logradouro) enderecoAutor.push(autor.logradouro);
          if (autor.numero) enderecoAutor.push(`nº ${autor.numero}`);
          if (autor.complemento) enderecoAutor.push(autor.complemento);
          if (autor.bairro) enderecoAutor.push(autor.bairro);
          if (autor.cidade) enderecoAutor.push(autor.cidade);
          if (autor.uf) enderecoAutor.push(autor.uf);
          if (autor.cep) enderecoAutor.push(`CEP: ${autor.cep}`);

          if (enderecoAutor.length > 0) {
            dadosAdicionais += `Endereço: ${enderecoAutor.join(', ')}\n`;
          }
        }

        if (reu) {
          dadosAdicionais += `\nRÉU:\n`;
          dadosAdicionais += `Nome: ${reu.nomeCompleto}\n`;

          if (reu.tipoPessoa === 'FISICA') {
            if (reu.cpf) dadosAdicionais += `CPF: ${reu.cpf}\n`;
            if (reu.rg) dadosAdicionais += `RG: ${reu.rg}${reu.orgaoEmissor ? ` - ${reu.orgaoEmissor}` : ''}\n`;
          } else {
            if (reu.cnpj) dadosAdicionais += `CNPJ: ${reu.cnpj}\n`;
            if (reu.razaoSocial) dadosAdicionais += `Razão Social: ${reu.razaoSocial}\n`;
            if (reu.inscricaoEstadual) dadosAdicionais += `Inscrição Estadual: ${reu.inscricaoEstadual}\n`;
          }

          const enderecoReu = [];
          if (reu.logradouro) enderecoReu.push(reu.logradouro);
          if (reu.numero) enderecoReu.push(`nº ${reu.numero}`);
          if (reu.complemento) enderecoReu.push(reu.complemento);
          if (reu.bairro) enderecoReu.push(reu.bairro);
          if (reu.cidade) enderecoReu.push(reu.cidade);
          if (reu.uf) enderecoReu.push(reu.uf);
          if (reu.cep) enderecoReu.push(`CEP: ${reu.cep}`);

          if (enderecoReu.length > 0) {
            dadosAdicionais += `Endereço: ${enderecoReu.join(', ')}\n`;
          }
        }

        if (advogado) {
          dadosAdicionais += `\nADVOGADO:\n`;
          dadosAdicionais += `Nome: ${advogado.nomeCompleto}\n`;
          if (advogado.oab) dadosAdicionais += `OAB: ${advogado.oab}\n`;

          const enderecoAdv = [];
          if (advogado.logradouro) enderecoAdv.push(advogado.logradouro);
          if (advogado.numero) enderecoAdv.push(`nº ${advogado.numero}`);
          if (advogado.complemento) enderecoAdv.push(advogado.complemento);
          if (advogado.bairro) enderecoAdv.push(advogado.bairro);
          if (advogado.cidade) enderecoAdv.push(advogado.cidade);
          if (advogado.uf) enderecoAdv.push(advogado.uf);

          if (enderecoAdv.length > 0) {
            dadosAdicionais += `Endereço: ${enderecoAdv.join(', ')}\n`;
          }
        }
      }

      // Template agora é OBRIGATÓRIO
      const userPrompt = `
        Elabore um documento jurídico USANDO OBRIGATORIAMENTE o modelo abaixo como base estrutural:

        === MODELO BASE (HTML) ===
        ${data.templateBase}
        === FIM DO MODELO BASE ===

        INSTRUÇÕES IMPORTANTES:
        1. MANTENHA a estrutura HTML do modelo
        2. SUBSTITUA todas as variáveis {{ }} pelos dados reais fornecidos abaixo
        3. ENRIQUEÇA o conteúdo com linguagem jurídica apropriada ao tipo de peça: ${data.tipoPeca}
        4. ADICIONE fundamentação legal quando aplicável
        5. MANTENHA formatação profissional e técnica
        6. Se uma variável não tiver dados disponíveis, deixe em branco ou use placeholder apropriado

        === DADOS PARA SUBSTITUIÇÃO ===

        ${dadosAdicionais}

        ${data.contexto ? `
        CONTEXTO ADICIONAL DO CASO:
        ${data.contexto}
        ` : ''}

        ${data.partes && data.partes.length > 0 ? `
        OBSERVAÇÕES SOBRE PARTES (texto livre):
        ${data.partes.join('\n')}
        ` : ''}

        ${data.fundamentosLegais ? `
        FUNDAMENTOS LEGAIS A INCLUIR:
        ${data.fundamentosLegais}
        ` : ''}

        ${data.pedidos ? `
        PEDIDOS A INCLUIR:
        ${data.pedidos}
        ` : ''}

        Por favor, gere o documento completo e formatado em HTML, mantendo a estrutura do modelo base e substituindo todas as variáveis pelos dados fornecidos.
      `;

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
