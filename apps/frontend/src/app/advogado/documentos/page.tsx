'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
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
  Info
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

export default function DocumentosPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPasta, setSelectedPasta] = useState<string | undefined>();
  const [selectedModelo, setSelectedModelo] = useState<Modelo | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [tituloModelo, setTituloModelo] = useState('');
  const [descricaoModelo, setDescricaoModelo] = useState('');
  const [modoEdicao, setModoEdicao] = useState<'novo' | 'editar' | null>(null);
  const [novaPastaNome, setNovaPastaNome] = useState('');
  const [mostrarNovaPasta, setMostrarNovaPasta] = useState(false);
  const [variavelInserida, setVariavelInserida] = useState<string | null>(null);

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

    // Inserir a variável no final do conteúdo atual
    setEditorContent((prev) => {
      // Se o conteúdo estiver vazio ou for apenas tags HTML vazias
      if (!prev || prev === '<p></p>' || prev.trim() === '') {
        return `<p>${variavelFormatada}</p>`;
      }
      // Se terminar com </p>, inserir dentro da última tag
      if (prev.endsWith('</p>')) {
        return prev.slice(0, -4) + ` ${variavelFormatada}</p>`;
      }
      // Caso contrário, adicionar em nova linha
      return prev + `<p>${variavelFormatada}</p>`;
    });

    // Mostrar feedback visual
    setVariavelInserida(chave);
    setTimeout(() => setVariavelInserida(null), 2000);

    toast({
      title: 'Variável inserida',
      description: `{{ ${chave} }} adicionada ao modelo`,
      variant: 'success',
    });
  };

  const variaveisDisponiveis = [
    { chave: 'processo_numero', descricao: 'Número do processo' },
    { chave: 'descricao_processo', descricao: 'Descrição do processo' },
    { chave: 'cliente_nome', descricao: 'Nome do cliente' },
    { chave: 'cliente_cpf', descricao: 'CPF do cliente' },
    { chave: 'cliente_endereco', descricao: 'Endereço completo do cliente' },
    { chave: 'advogado_nome', descricao: 'Nome do advogado' },
    { chave: 'advogado_oab', descricao: 'Número OAB do advogado' },
    { chave: 'reu_nome', descricao: 'Nome do réu/reclamado' },
    { chave: 'narrativa_fatos', descricao: 'Narrativa detalhada dos fatos' },
    { chave: 'valor_causa', descricao: 'Valor da causa em R$' },
    { chave: 'preliminares', descricao: 'Preliminares processuais' },
    { chave: 'merito', descricao: 'Mérito da questão' },
    { chave: 'honorarios', descricao: 'Valor dos honorários' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Documentos</h1>
        <p className="text-gray-500">Crie e gerencie modelos de documentos jurídicos reutilizáveis</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
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
                  <RichTextEditor
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {variaveisDisponiveis.map((variavel) => (
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
                        {'{{ ' + variavel.chave + ' }}'}
                      </code>
                      <span className="text-xs text-gray-600 flex-1">{variavel.descricao}</span>
                    </button>
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
    </div>
  );
}
