'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AdvancedRichTextEditor, type AdvancedRichTextEditorHandle } from '@/components/shared/AdvancedRichTextEditor';
import SelectCliente from '@/components/advogado/SelectCliente';
import SelectProcesso from '@/components/advogado/SelectProcesso';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  FileText,
  Folder,
  FolderPlus,
  FilePlus,
  Save,
  Copy,
  Trash2,
  Info,
  Settings,
  FileEdit,
  Download
} from 'lucide-react';

type Pasta = {
  id: string;
  nome: string;
  parentId?: string;
};

type Modelo = {
  id: string;
  nome: string;
  descricao?: string;
  conteudo: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
};

type ClienteDetalhado = {
  id: string;
  user: {
    nome: string;
    email: string;
  };
  tipoPessoa?: string;
  cpf?: string;
  rg?: string;
  orgaoEmissor?: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  dataNascimento?: string;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  representanteLegal?: string;
  cargoRepresentante?: string;
  telefone?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

type ParteProcessual = {
  id: string;
  tipoParte: string;
  tipoPessoa: string;
  nomeCompleto?: string;
  cpf?: string;
  rg?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  representanteLegal?: string;
  cargoRepresentante?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

type ProcessoDetalhado = {
  id: string;
  numero: string;
  descricao?: string;
  tipoAcao?: string;
  areaDireito?: string;
  justica?: string;
  instancia?: string;
  comarca?: string;
  foro?: string;
  vara?: string;
  uf?: string;
  objetoAcao?: string;
  pedidoPrincipal?: string;
  valorCausa?: string | number | null;
  valorHonorarios?: string | number | null;
  dataDistribuicao?: string;
  dataInicio?: string;
  proximoPrazo?: string;
  descricaoPrazo?: string;
  status?: string;
  prioridade?: string;
  observacoes?: string;
  clienteId?: string;
  advogadoId?: string;
  cliente?: ClienteDetalhado;
  advogado?: {
    user: {
      nome: string;
      email?: string;
    };
    oab?: string;
    telefone?: string;
  };
  partes?: ParteProcessual[];
};

export default function DocumentosPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Tab control
  const [activeTab, setActiveTab] = useState<'templates' | 'documents'>('templates');

  // Template Management States
  const [selectedPasta, setSelectedPasta] = useState<string | undefined>();
  const [selectedModelo, setSelectedModelo] = useState<Modelo | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [tituloModelo, setTituloModelo] = useState('');
  const [descricaoModelo, setDescricaoModelo] = useState('');
  const [modoEdicao, setModoEdicao] = useState<'novo' | 'editar' | null>(null);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [mostrarNovaPasta, setMostrarNovaPasta] = useState(false);
  const [variavelInserida, setVariavelInserida] = useState<string | null>(null);
  const templateEditorRef = useRef<AdvancedRichTextEditorHandle | null>(null);

  // Document Creation States
  const [modeloSelecionado, setModeloSelecionado] = useState<Modelo | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [processoId, setProcessoId] = useState('');
  const [documentoConteudo, setDocumentoConteudo] = useState('');
  const [tituloDocumento, setTituloDocumento] = useState('');
  const [documentoProcessoId, setDocumentoProcessoId] = useState('');
  const [isSavingDocumento, setIsSavingDocumento] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteDetalhado | null>(null);
  const [clienteDetalhado, setClienteDetalhado] = useState<ClienteDetalhado | null>(null);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoDetalhado | null>(null);
  const [processoDetalhado, setProcessoDetalhado] = useState<ProcessoDetalhado | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: biblioteca, isLoading } = useQuery({
    queryKey: ['documentos', 'biblioteca'],
    queryFn: async () => {
      const response = await api.get('/documentos', { params: { includeTemplates: true } });
      return response.data as { templates: Modelo[]; folders: Pasta[] };
    },
  });

  const modelosFiltrados = useMemo(() => {
    if (!biblioteca?.templates) return [];
    if (!selectedPasta) return biblioteca.templates;
    return biblioteca.templates.filter((modelo) => modelo.folderId === selectedPasta);
  }, [biblioteca?.templates, selectedPasta]);

  useEffect(() => {
    if (selectedModelo && modoEdicao === 'editar') {
      setTituloModelo(selectedModelo.nome);
      setDescricaoModelo(selectedModelo.descricao || '');
      setEditorContent(selectedModelo.conteudo);
    }
  }, [selectedModelo, modoEdicao]);

  const formatDate = (value?: string | Date | null) => {
    if (!value) return '';
    setIsExporting(true);
    try {
      return new Date(value).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const formatCurrency = (value?: string | number | null) => {
    if (value === null || value === undefined) return '';
    const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (Number.isNaN(numericValue)) return '';
    return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatAddress = (data?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  }) => {
    if (!data) return '';
    const { logradouro, numero, complemento, bairro, cidade, uf, cep } = data;
    return [
      [logradouro, numero].filter(Boolean).join(', '),
      complemento,
      bairro,
      cidade,
      uf,
      cep,
    ]
      .filter(Boolean)
      .join(' - ');
  };

  const carregarClienteDetalhado = async (id: string) => {
    if (!id) {
      setClienteDetalhado(null);
      return;
    }

    try {
      const response = await api.get(`/clientes/${id}`);
      setClienteDetalhado(response.data);
      setClienteSelecionado(response.data);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Não foi possível carregar os dados completos do cliente',
        variant: 'error',
      });
    }
  };

  const carregarProcessoDetalhado = async (id: string) => {
    if (!id) {
      setProcessoDetalhado(null);
      return;
    }

    try {
      const response = await api.get(`/processos/${id}`);
      setProcessoDetalhado(response.data);
      setProcessoSelecionado(response.data);

      if (response.data?.cliente) {
        setClienteId(response.data.clienteId || response.data.cliente.id || '');
        setClienteSelecionado(response.data.cliente);
        setClienteDetalhado(response.data.cliente);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Não foi possível carregar os dados completos do processo',
        variant: 'error',
      });
    }
  };

  const obterMapaVariaveis = () => {
    const processo = processoDetalhado || processoSelecionado;
    const cliente = clienteDetalhado || processo?.cliente || clienteSelecionado;
    const advogado = processo?.advogado;
    const reu = processo?.partes?.find((p) => p.tipoParte === 'REU');
    const autor = processo?.partes?.find((p) => p.tipoParte === 'AUTOR');

    const partesResumo = processo?.partes
      ?.map((parte) => {
        const nome = parte.nomeCompleto || parte.razaoSocial || '';
        return `${parte.tipoParte}: ${nome}`;
      })
      .filter(Boolean)
      .join(' | ') || '';

    return {
      // Processo
      processo_numero: processo?.numero || '',
      descricao_processo: processo?.descricao || '',
      processo_tipo_acao: processo?.tipoAcao || '',
      processo_area_direito: processo?.areaDireito || '',
      processo_justica: processo?.justica || '',
      processo_instancia: processo?.instancia || '',
      processo_comarca: processo?.comarca || '',
      processo_foro: processo?.foro || '',
      processo_vara: processo?.vara || '',
      processo_uf: processo?.uf || '',
      processo_objeto_acao: processo?.objetoAcao || '',
      processo_pedido_principal: processo?.pedidoPrincipal || '',
      processo_valor_causa: formatCurrency(processo?.valorCausa as any),
      processo_valor_honorarios: formatCurrency(processo?.valorHonorarios as any),
      processo_data_distribuicao: formatDate(processo?.dataDistribuicao as any),
      processo_data_inicio: formatDate(processo?.dataInicio as any),
      processo_proximo_prazo: formatDate(processo?.proximoPrazo as any),
      processo_descricao_prazo: processo?.descricaoPrazo || '',
      processo_status: processo?.status || '',
      processo_prioridade: processo?.prioridade || '',
      processo_observacoes: processo?.observacoes || '',

      // Cliente / Autor
      cliente_nome: cliente?.user?.nome || '',
      cliente_email: cliente?.user?.email || '',
      cliente_cpf: cliente?.cpf || '',
      cliente_rg: cliente?.rg || '',
      cliente_orgao_emissor: cliente?.orgaoEmissor || '',
      cliente_nacionalidade: cliente?.nacionalidade || '',
      cliente_estado_civil: cliente?.estadoCivil || '',
      cliente_profissao: cliente?.profissao || '',
      cliente_data_nascimento: formatDate(cliente?.dataNascimento),
      cliente_tipo_pessoa: cliente?.tipoPessoa || '',
      cliente_cnpj: cliente?.cnpj || '',
      cliente_razao_social: cliente?.razaoSocial || '',
      cliente_nome_fantasia: cliente?.nomeFantasia || '',
      cliente_inscricao_estadual: cliente?.inscricaoEstadual || '',
      cliente_representante_legal: cliente?.representanteLegal || '',
      cliente_cargo_representante: cliente?.cargoRepresentante || '',
      cliente_telefone: cliente?.telefone || '',
      cliente_celular: cliente?.celular || '',
      cliente_cep: cliente?.cep || '',
      cliente_logradouro: cliente?.logradouro || '',
      cliente_numero: cliente?.numero || '',
      cliente_complemento: cliente?.complemento || '',
      cliente_bairro: cliente?.bairro || '',
      cliente_cidade: cliente?.cidade || '',
      cliente_uf: cliente?.uf || '',
      cliente_endereco: formatAddress(cliente || undefined),

      // Advogado
      advogado_nome: advogado?.user?.nome || '',
      advogado_oab: advogado?.oab || '',
      advogado_telefone: advogado?.telefone || '',

      // Réu
      reu_nome: reu?.nomeCompleto || reu?.razaoSocial || '',
      reu_tipo_pessoa: reu?.tipoPessoa || '',
      reu_cpf: reu?.cpf || '',
      reu_cnpj: reu?.cnpj || '',
      reu_razao_social: reu?.razaoSocial || '',
      reu_nome_fantasia: reu?.nomeFantasia || '',
      reu_email: reu?.email || '',
      reu_telefone: reu?.telefone || '',
      reu_celular: reu?.celular || '',
      reu_cep: reu?.cep || '',
      reu_logradouro: reu?.logradouro || '',
      reu_numero: reu?.numero || '',
      reu_complemento: reu?.complemento || '',
      reu_bairro: reu?.bairro || '',
      reu_cidade: reu?.cidade || '',
      reu_uf: reu?.uf || '',
      reu_endereco: formatAddress(reu || undefined),
      reu_representante_legal: reu?.representanteLegal || '',
      reu_cargo_representante: reu?.cargoRepresentante || '',

      // Autor / fallback cliente
      autor_nome: autor?.nomeCompleto || autor?.razaoSocial || cliente?.user?.nome || '',
      autor_cpf: autor?.cpf || cliente?.cpf || '',
      autor_cnpj: autor?.cnpj || cliente?.cnpj || '',
      autor_endereco: formatAddress(autor || undefined) || formatAddress(cliente || undefined),

      narrativa_fatos: processo?.descricao || '',
      valor_causa: formatCurrency(processo?.valorCausa as any),
      preliminares: '',
      merito: '',
      honorarios: '',
      partes_resumo: partesResumo,
    } as Record<string, string>;
  };

  const criarPastaMutation = useMutation({
    mutationFn: async (nome: string) => {
      const response = await api.post('/documentos/pastas', { nome });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
      setNovaPastaNome('');
      setMostrarNovaPasta(false);
      toast({ title: 'Sucesso', description: 'Pasta criada com sucesso!', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao criar pasta', variant: 'error' });
    },
  });

  const salvarModeloMutation = useMutation({
    mutationFn: async (dados: { nome: string; descricao?: string; conteudo: string; folderId?: string }) => {
      if (modoEdicao === 'editar' && selectedModelo) {
        const response = await api.put(`/documentos/modelos/${selectedModelo.id}`, dados);
        return response.data;
      } else {
        const response = await api.post('/documentos/modelos', dados);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
      limparEditor();
      toast({
        title: 'Sucesso',
        description: modoEdicao === 'editar' ? 'Modelo atualizado!' : 'Modelo criado!',
        variant: 'success'
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao salvar modelo', variant: 'error' });
    },
  });

  const duplicarModeloMutation = useMutation({
    mutationFn: async (modeloId: string) => {
      const response = await api.post(`/documentos/modelos/${modeloId}/duplicar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
      toast({ title: 'Sucesso', description: 'Modelo duplicado com sucesso!', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao duplicar modelo', variant: 'error' });
    },
  });

  const deletarModeloMutation = useMutation({
    mutationFn: async (modeloId: string) => {
      await api.delete(`/documentos/modelos/${modeloId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
      if (selectedModelo) {
        limparEditor();
      }
      toast({ title: 'Sucesso', description: 'Modelo excluído com sucesso!', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao deletar modelo', variant: 'error' });
    },
  });

  const handleCriarNovaPasta = () => {
    if (novaPastaNome.trim()) {
      criarPastaMutation.mutate(novaPastaNome.trim());
    }
  };

  const handleNovoModelo = () => {
    limparEditor();
    setModoEdicao('novo');
  };

  const handleEditarModelo = (modelo: Modelo) => {
    setSelectedModelo(modelo);
    setModoEdicao('editar');
  };

  const handleSalvarModelo = () => {
    if (!tituloModelo.trim() || !editorContent.trim()) {
      toast({ title: 'Atenção', description: 'Preencha título e conteúdo', variant: 'error' });
      return;
    }

    salvarModeloMutation.mutate({
      nome: tituloModelo,
      descricao: descricaoModelo,
      conteudo: editorContent,
      folderId: selectedPasta || undefined,
    });
  };

  const handleDuplicarModelo = (modeloId: string) => {
    duplicarModeloMutation.mutate(modeloId);
  };

  const handleDeletarModelo = (modeloId: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo?')) {
      deletarModeloMutation.mutate(modeloId);
    }
  };

  const limparEditor = () => {
    setTituloModelo('');
    setDescricaoModelo('');
    setEditorContent('');
    setSelectedModelo(null);
    setModoEdicao(null);
  };

  const inserirVariavel = (chave: string) => {
    const variavelFormatada = `{{ ${chave} }}`;

    if (templateEditorRef.current) {
      templateEditorRef.current.focus();
      templateEditorRef.current.insertContent(variavelFormatada);
    } else {
      setEditorContent((prev) => {
        if (!prev || prev === '<p></p>' || prev.trim() === '') {
          return `<p>${variavelFormatada}</p>`;
        }
        if (prev.endsWith('</p>')) {
          return prev.slice(0, -4) + ` ${variavelFormatada}</p>`;
        }
        return prev + `<p>${variavelFormatada}</p>`;
      });
    }

    // Mostrar feedback visual
    setVariavelInserida(chave);
    setTimeout(() => setVariavelInserida(null), 2000);

    toast({
      title: 'Variavel inserida',
      description: `{{ ${chave} }} adicionada ao modelo`,
      variant: 'success',
    });
  };

  // Document Creation Functions
  const handleSelecionarModelo = (modelo: Modelo) => {
    setModeloSelecionado(modelo);
    setTituloDocumento(modelo.nome);
    setDocumentoConteudo(modelo.conteudo);
  };

  const substituirVariaveis = (conteudo: string): string => {
    const mapaVariaveis = obterMapaVariaveis();

    return Object.entries(mapaVariaveis).reduce((acc, [chave, valor]) => {
      const regex = new RegExp(`\\{\\{\\s*${chave}\\s*\\}\\}`, 'g');
      return acc.replace(regex, valor || '');
    }, conteudo);
  };

  const handleGerarDocumento = async () => {
    if (!modeloSelecionado) {
      toast({ title: 'Atenção', description: 'Selecione um modelo', variant: 'error' });
      return;
    }

    if (!clienteId || !processoId) {
      toast({ title: 'Atenção', description: 'Selecione cliente e processo', variant: 'error' });
      return;
    }

    const conteudoComVariaveisSubstituidas = substituirVariaveis(modeloSelecionado.conteudo);
    setDocumentoConteudo(conteudoComVariaveisSubstituidas);

    setIsSavingDocumento(true);
    try {
      const response = await api.post('/documentos-processo', {
        processoId,
        clienteId,
        templateId: modeloSelecionado?.id || null,
        titulo: tituloDocumento || modeloSelecionado.nome,
        conteudoHTML: conteudoComVariaveisSubstituidas
      });

      setDocumentoProcessoId(response.data.id);
      queryClient.invalidateQueries({ queryKey: ['processo', processoId] });

      toast({
        title: 'Documento gerado',
        description: 'Documento gerado e salvo no processo selecionado.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao salvar documento',
        variant: 'error',
      });
    } finally {
      setIsSavingDocumento(false);
    }
  };

  const handleExportarDocumento = async (formato: 'pdf' | 'docx') => {
    if (!documentoConteudo) {
      toast({ title: 'Atenção', description: 'Gere um documento primeiro', variant: 'error' });
      return;
    }

    try {
      const endpoint = `/ia/exportar-${formato}`;
      const response = await api.post(
        endpoint,
        { conteudo: documentoConteudo, titulo: tituloDocumento },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tituloDocumento}.${formato}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Sucesso', description: `Documento exportado em ${formato.toUpperCase()}`, variant: 'success' });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erro ao exportar documento';
      toast({ title: 'Erro', description: errorMessage, variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const variaveisDisponiveis = [
    {
      titulo: 'Processo e prazos',
      variaveis: [
        { chave: 'processo_numero', descricao: 'Numero do processo' },
        { chave: 'descricao_processo', descricao: 'Descricao/resumo do processo' },
        { chave: 'processo_tipo_acao', descricao: 'Tipo da acao' },
        { chave: 'processo_area_direito', descricao: 'Area do direito' },
        { chave: 'processo_justica', descricao: 'Justica' },
        { chave: 'processo_instancia', descricao: 'Instancia' },
        { chave: 'processo_comarca', descricao: 'Comarca' },
        { chave: 'processo_foro', descricao: 'Foro' },
        { chave: 'processo_vara', descricao: 'Vara' },
        { chave: 'processo_uf', descricao: 'UF do processo' },
        { chave: 'processo_objeto_acao', descricao: 'Objeto da acao' },
        { chave: 'processo_pedido_principal', descricao: 'Pedido principal' },
        { chave: 'processo_valor_causa', descricao: 'Valor da causa (formatado)' },
        { chave: 'processo_valor_honorarios', descricao: 'Valor dos honorarios contratuais' },
        { chave: 'processo_data_distribuicao', descricao: 'Data de distribuicao' },
        { chave: 'processo_data_inicio', descricao: 'Data de inicio' },
        { chave: 'processo_proximo_prazo', descricao: 'Proximo prazo' },
        { chave: 'processo_descricao_prazo', descricao: 'Descricao do prazo' },
        { chave: 'processo_status', descricao: 'Status do processo' },
        { chave: 'processo_prioridade', descricao: 'Prioridade' },
        { chave: 'processo_observacoes', descricao: 'Observacoes internas' },
        { chave: 'valor_causa', descricao: 'Valor da causa (compatibilidade legada)' },
      ],
    },
    {
      titulo: 'Cliente / Autor - Pessoa Fisica',
      variaveis: [
        { chave: 'cliente_nome', descricao: 'Nome completo' },
        { chave: 'cliente_email', descricao: 'E-mail' },
        { chave: 'cliente_cpf', descricao: 'CPF' },
        { chave: 'cliente_rg', descricao: 'RG' },
        { chave: 'cliente_orgao_emissor', descricao: 'Orgao emissor do RG' },
        { chave: 'cliente_nacionalidade', descricao: 'Nacionalidade' },
        { chave: 'cliente_estado_civil', descricao: 'Estado civil' },
        { chave: 'cliente_profissao', descricao: 'Profissao' },
        { chave: 'cliente_data_nascimento', descricao: 'Data de nascimento' },
        { chave: 'cliente_telefone', descricao: 'Telefone' },
        { chave: 'cliente_celular', descricao: 'Celular' },
        { chave: 'cliente_cep', descricao: 'CEP' },
        { chave: 'cliente_logradouro', descricao: 'Logradouro' },
        { chave: 'cliente_numero', descricao: 'Numero' },
        { chave: 'cliente_complemento', descricao: 'Complemento' },
        { chave: 'cliente_bairro', descricao: 'Bairro' },
        { chave: 'cliente_cidade', descricao: 'Cidade' },
        { chave: 'cliente_uf', descricao: 'UF' },
        { chave: 'cliente_endereco', descricao: 'Endereco completo' },
      ],
    },
    {
      titulo: 'Cliente / Autor - Pessoa Juridica',
      variaveis: [
        { chave: 'cliente_tipo_pessoa', descricao: 'Tipo de pessoa (FISICA/JURIDICA)' },
        { chave: 'cliente_cnpj', descricao: 'CNPJ' },
        { chave: 'cliente_razao_social', descricao: 'Razao Social' },
        { chave: 'cliente_nome_fantasia', descricao: 'Nome Fantasia' },
        { chave: 'cliente_inscricao_estadual', descricao: 'Inscricao Estadual' },
        { chave: 'cliente_representante_legal', descricao: 'Representante Legal' },
        { chave: 'cliente_cargo_representante', descricao: 'Cargo do Representante' },
      ],
    },
    {
      titulo: 'Advogado Responsavel',
      variaveis: [
        { chave: 'advogado_nome', descricao: 'Nome do advogado' },
        { chave: 'advogado_oab', descricao: 'Numero da OAB' },
        { chave: 'advogado_telefone', descricao: 'Telefone' },
      ],
    },
    {
      titulo: 'Parte contraria (Reu/Interessado)',
      variaveis: [
        { chave: 'reu_nome', descricao: 'Nome ou Razao Social' },
        { chave: 'reu_tipo_pessoa', descricao: 'Tipo de pessoa' },
        { chave: 'reu_cpf', descricao: 'CPF do reu' },
        { chave: 'reu_cnpj', descricao: 'CNPJ do reu' },
        { chave: 'reu_razao_social', descricao: 'Razao Social' },
        { chave: 'reu_nome_fantasia', descricao: 'Nome Fantasia' },
        { chave: 'reu_email', descricao: 'E-mail' },
        { chave: 'reu_telefone', descricao: 'Telefone' },
        { chave: 'reu_celular', descricao: 'Celular' },
        { chave: 'reu_cep', descricao: 'CEP' },
        { chave: 'reu_logradouro', descricao: 'Logradouro' },
        { chave: 'reu_numero', descricao: 'Numero' },
        { chave: 'reu_complemento', descricao: 'Complemento' },
        { chave: 'reu_bairro', descricao: 'Bairro' },
        { chave: 'reu_cidade', descricao: 'Cidade' },
        { chave: 'reu_uf', descricao: 'UF' },
        { chave: 'reu_endereco', descricao: 'Endereco completo' },
        { chave: 'reu_representante_legal', descricao: 'Representante Legal' },
        { chave: 'reu_cargo_representante', descricao: 'Cargo do Representante' },
      ],
    },
    {
      titulo: 'Autor (quando diferente do cliente)',
      variaveis: [
        { chave: 'autor_nome', descricao: 'Nome ou Razao Social do autor' },
        { chave: 'autor_cpf', descricao: 'CPF do autor' },
        { chave: 'autor_cnpj', descricao: 'CNPJ do autor' },
        { chave: 'autor_endereco', descricao: 'Endereco do autor' },
      ],
    },
    {
      titulo: 'Trechos e resumos',
      variaveis: [
        { chave: 'narrativa_fatos', descricao: 'Narrativa dos fatos' },
        { chave: 'preliminares', descricao: 'Preliminares processuais' },
        { chave: 'merito', descricao: 'Merito da questao' },
        { chave: 'honorarios', descricao: 'Honorarios' },
        { chave: 'partes_resumo', descricao: 'Resumo das partes envolvidas' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Documentos</h1>
        <p className="text-gray-500">Gerencie modelos e crie documentos personalizados</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'templates'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Settings className="h-4 w-4" />
            Gerenciar Modelos
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'documents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <FileEdit className="h-4 w-4" />
            Criar Documento
          </button>
        </nav>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Template Management Tab */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar Pastas / Modelos */}
          <div className="lg:col-span-1 space-y-4">
            {/* Pastas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary-600" /> Pastas
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMostrarNovaPasta(!mostrarNovaPasta)}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mostrarNovaPasta && (
                  <div className="mb-3 space-y-2">
                    <Input
                      placeholder="Nome da pasta"
                      value={novaPastaNome}
                      onChange={(e) => setNovaPastaNome(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCriarNovaPasta()}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCriarNovaPasta}
                        disabled={criarPastaMutation.isPending}
                      >
                        Criar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMostrarNovaPasta(false);
                          setNovaPastaNome('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  variant={!selectedPasta ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedPasta(undefined)}
                >
                  Todas
                </Button>
                {biblioteca?.folders?.map((p) => (
                  <Button
                    key={p.id}
                    variant={selectedPasta === p.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedPasta(p.id)}
                  >
                    {p.nome}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Modelos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary-600" /> Modelos
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNovoModelo}
                  >
                    <FilePlus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                {modelosFiltrados?.length ? (
                  modelosFiltrados.map((modelo) => (
                    <div
                      key={modelo.id}
                      className={`border rounded-md p-3 hover:border-primary-300 ${
                        selectedModelo?.id === modelo.id && modoEdicao === 'editar'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => handleEditarModelo(modelo)}
                      >
                        <div className="font-semibold">{modelo.nome}</div>
                        <p className="text-sm text-gray-500">{modelo.descricao}</p>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicarModelo(modelo.id);
                          }}
                          title="Duplicar modelo"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletarModelo(modelo.id);
                          }}
                          title="Excluir modelo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum modelo nesta pasta
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  Editor de Modelo
                  {modoEdicao === 'novo' && <Badge variant="success">Novo</Badge>}
                  {modoEdicao === 'editar' && <Badge variant="info">Editando</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Título do Modelo *</label>
                    <Input
                      value={tituloModelo}
                      onChange={(e) => setTituloModelo(e.target.value)}
                      placeholder="Ex: Petição Inicial - Ação Trabalhista"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pasta</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      value={selectedPasta || ''}
                      onChange={(e) => setSelectedPasta(e.target.value || undefined)}
                    >
                      <option value="">Sem pasta</option>
                      {biblioteca?.folders?.map((pasta) => (
                        <option key={pasta.id} value={pasta.id}>
                          {pasta.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Descrição</label>
                  <Textarea
                    value={descricaoModelo}
                    onChange={(e) => setDescricaoModelo(e.target.value)}
                    placeholder="Breve descrição sobre este modelo"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Conteúdo do Modelo *</label>
                  <AdvancedRichTextEditor
                    ref={templateEditorRef}
                    content={editorContent}
                    onChange={(html) => setEditorContent(html)}
                    placeholder="Digite o conteúdo do modelo. Use {{ variavel }} para campos dinâmicos."
                    minHeight="500px"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSalvarModelo}
                    disabled={salvarModeloMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {modoEdicao === 'editar' ? 'Atualizar Modelo' : 'Salvar Modelo'}
                  </Button>

                  {modoEdicao && (
                    <Button variant="outline" onClick={limparEditor}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Variáveis Disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary-600" /> Variáveis Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Use estas variáveis em seus modelos. Elas serão substituídas automaticamente quando o modelo for usado na IA Jurídica:
                </p>
                <div className="space-y-3">
                  {variaveisDisponiveis.map((grupo) => (
                    <div key={grupo.titulo} className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {grupo.titulo}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {grupo.variaveis.map((variavel) => (
                          <button
                            key={variavel.chave}
                            onClick={() => inserirVariavel(variavel.chave)}
                            disabled={!modoEdicao}
                            className={`flex items-start gap-2 p-2 rounded border text-left transition-all ${
                              !modoEdicao
                                ? 'bg-gray-50 cursor-not-allowed opacity-60'
                                : variavelInserida === variavel.chave
                                ? 'bg-green-100 border-green-500 shadow-md scale-105'
                                : 'bg-gray-50 hover:bg-primary-50 hover:border-primary-300 cursor-pointer hover:shadow-sm'
                            }`}
                            title={!modoEdicao ? 'Crie ou edite um modelo para usar variáveis' : 'Clique para inserir esta variável'}
                          >
                            <code className={`text-xs px-2 py-1 rounded border font-mono whitespace-nowrap ${
                              variavelInserida === variavel.chave
                                ? 'bg-green-200 text-green-800 border-green-400'
                                : 'bg-white text-primary-600 border-gray-200'
                            }`}>
                              {`{{ `}{variavel.chave}{` }}`}
                            </code>
                            <span className="text-xs text-gray-600 flex-1">{variavel.descricao}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {!modoEdicao && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Crie ou edite um modelo para usar as variáveis clicáveis
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          )}

          {/* Document Creation Tab */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sidebar - Seleção de Modelo */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" /> Selecionar Modelo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      Escolha um modelo da biblioteca para criar um documento personalizado
                    </p>

                    {/* Filtro por pasta */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Filtrar por pasta</label>
                      <select
                        className="w-full border rounded-md h-9 px-3 text-sm"
                        value={selectedPasta || ''}
                        onChange={(e) => setSelectedPasta(e.target.value || undefined)}
                      >
                        <option value="">Todas as pastas</option>
                        {biblioteca?.folders?.map((pasta) => (
                          <option key={pasta.id} value={pasta.id}>
                            {pasta.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                      {modelosFiltrados?.length ? (
                        modelosFiltrados.map((modelo) => (
                          <div
                            key={modelo.id}
                            onClick={() => handleSelecionarModelo(modelo)}
                            className={`border rounded-md p-3 cursor-pointer transition-all ${
                              modeloSelecionado?.id === modelo.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-semibold text-sm">{modelo.nome}</div>
                            <p className="text-xs text-gray-500 mt-1">{modelo.descricao}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhum modelo disponível
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content - Configuração e Editor */}
              <div className="lg:col-span-3 space-y-4">
                {/* Configuração do Documento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileEdit className="h-5 w-5 text-primary-600" />
                      Configurar Documento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Título do Documento</label>
                        <Input
                          value={tituloDocumento}
                          onChange={(e) => setTituloDocumento(e.target.value)}
                          placeholder="Nome do documento"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Modelo Base</label>
                        <Input
                          value={modeloSelecionado?.nome || ''}
                          disabled
                          placeholder="Selecione um modelo ao lado"
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SelectCliente
                        value={clienteId}
                        onChange={(id, cliente) => {
                          setClienteId(id);
                          setClienteSelecionado(cliente as any);
                          setProcessoId('');
                          setProcessoSelecionado(null);
                          setProcessoDetalhado(null);
                          setDocumentoProcessoId('');
                          if (id) {
                            carregarClienteDetalhado(id);
                          } else {
                            setClienteDetalhado(null);
                          }
                        }}
                      />
                      <SelectProcesso
                        value={processoId}
                        clienteId={clienteId}
                        onChange={(id, processo) => {
                          setProcessoId(id);
                          setProcessoSelecionado(processo as any);
                          setProcessoDetalhado(null);
                          setDocumentoProcessoId('');
                          if (id) {
                            carregarProcessoDetalhado(id);
                          }
                        }}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleGerarDocumento}
                        disabled={!modeloSelecionado || isSavingDocumento}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {isSavingDocumento ? 'Salvando...' : 'Gerar Documento'}
                      </Button>

                      {documentoConteudo && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleExportarDocumento('pdf')}
                            disabled={isExporting}
                          >
                            {isExporting ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar PDF
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleExportarDocumento('docx')}
                            disabled={isExporting}
                          >
                            {isExporting ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar DOCX
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                    {clienteSelecionado && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                        <p className="font-semibold text-blue-900">Cliente: {clienteSelecionado.user.nome}</p>
                        {processoSelecionado && (
                          <p className="text-blue-700">Processo: {processoSelecionado.numero}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Editor do Documento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      Documento
                      {documentoConteudo && <Badge variant="success">Gerado</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {modeloSelecionado ? (
                      <>
                        <p className="text-sm text-gray-600 mb-3">
                          {documentoConteudo
                            ? 'Edite o documento gerado conforme necessário antes de exportar.'
                            : 'Clique em "Gerar Documento" para preencher o modelo com os dados do cliente e processo.'}
                        </p>
                        <AdvancedRichTextEditor
                          content={documentoConteudo}
                          onChange={(html) => setDocumentoConteudo(html)}
                          placeholder="O documento gerado aparecerá aqui..."
                          minHeight="500px"
                          editable={!!documentoConteudo}
                        />
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Selecione um modelo ao lado para começar</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}




