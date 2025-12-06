'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { Download, FileText, Folder, Layers, Wand2, CheckCircle2, Clock3 } from 'lucide-react';

type Documento = {
  id: string;
  titulo: string;
  tipo: string;
  tamanho: number;
  createdAt: string;
  status: 'DRAFT' | 'EM_REVISAO' | 'FINALIZADO' | 'ANEXADO';
  conteudo?: string;
  processo?: { numero: string };
  template?: { nome: string };
  folder?: { id: string; nome: string };
};

type DocumentoHistorico = {
  id: string;
  acao: string;
  status: string;
  detalhe?: string;
  createdAt: string;
  user: { nome: string; email: string };
};

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
};

type Processo = {
  id: string;
  numero: string;
  descricao?: string;
};

export default function DocumentosPage() {
  const queryClient = useQueryClient();
  const [selectedPasta, setSelectedPasta] = useState<string | undefined>();
  const [selectedModelo, setSelectedModelo] = useState<Modelo | null>(null);
  const [selectedProcesso, setSelectedProcesso] = useState<string>('');
  const [editorContent, setEditorContent] = useState('');
  const [documentoAtual, setDocumentoAtual] = useState<Documento | null>(null);
  const [tituloDocumento, setTituloDocumento] = useState('');
  const [descricaoDocumento, setDescricaoDocumento] = useState('');

  const { data: biblioteca, isLoading } = useQuery({
    queryKey: ['documentos', 'biblioteca'],
    queryFn: async () => {
      const response = await api.get('/documentos', { params: { includeTemplates: true } });
      return response.data as { documentos: Documento[]; templates: Modelo[]; folders: Pasta[] };
    },
  });

  const { data: processos } = useQuery({
    queryKey: ['processos'],
    queryFn: async () => {
      const response = await api.get('/processos');
      return response.data?.processos || [];
    },
  });

  const historicoQuery = useQuery({
    queryKey: ['documentos', documentoAtual?.id, 'historico'],
    queryFn: async () => {
      if (!documentoAtual?.id) return [];
      const response = await api.get(`/documentos/${documentoAtual.id}/historico`);
      return response.data as DocumentoHistorico[];
    },
    enabled: !!documentoAtual?.id,
  });

  useEffect(() => {
    if (selectedModelo) {
      setTituloDocumento(selectedModelo.nome);
      setEditorContent(selectedModelo.conteudo);
    }
  }, [selectedModelo]);

  useEffect(() => {
    if (documentoAtual) {
      setTituloDocumento(documentoAtual.titulo);
      setEditorContent(documentoAtual.conteudo || '');
    }
  }, [documentoAtual]);

  const documentosFiltrados = useMemo(() => {
    if (!biblioteca?.documentos) return [];
    if (!selectedPasta) return biblioteca.documentos;
    return biblioteca.documentos.filter((doc) => doc.folder?.id === selectedPasta);
  }, [biblioteca?.documentos, selectedPasta]);

  const handleDownload = async (id: string, titulo: string) => {
    try {
      const response = await api.get(`/documentos/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = titulo;
      link.click();
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
    }
  };

  const handleGerar = async () => {
    if (!selectedModelo || !selectedProcesso) return;
    const payload = {
      processoId: selectedProcesso,
      folderId: selectedPasta,
      titulo: tituloDocumento,
      descricao: descricaoDocumento,
    };
    const response = await api.post(`/documentos/modelos/${selectedModelo.id}/gerar`, payload);
    setDocumentoAtual(response.data);
    setEditorContent(response.data.conteudo || '');
    queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
  };

  const handleSalvarConteudo = async () => {
    if (!documentoAtual) return;
    await api.put(`/documentos/${documentoAtual.id}`, {
      conteudo: editorContent,
      titulo: tituloDocumento || documentoAtual.titulo,
      descricao: descricaoDocumento,
      folderId: selectedPasta,
    });
    queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
  };

  const handleStatus = async (status: Documento['status']) => {
    if (!documentoAtual) return;
    const response = await api.patch(`/documentos/${documentoAtual.id}/status`, { status });
    setDocumentoAtual(response.data);
    queryClient.invalidateQueries({ queryKey: ['documentos', 'biblioteca'] });
    historicoQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Documentos</h1>
          <p className="text-gray-500">Modelos, organização por pastas e geração automática com IA Jurídica.</p>
        </div>
        <Badge variant="info" className="flex items-center gap-1">
          <Layers className="h-4 w-4" /> Novo
        </Badge>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar Pastas / Modelos */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary-600" /> Pastas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" /> Modelos Jurídicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                {biblioteca?.templates?.map((modelo) => (
                  <button
                    key={modelo.id}
                    onClick={() => setSelectedModelo(modelo)}
                    className={`w-full text-left border rounded-md p-3 hover:border-primary-300 ${
                      selectedModelo?.id === modelo.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-semibold">{modelo.nome}</div>
                    <p className="text-sm text-gray-500">{modelo.descricao}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary-600" /> Editor avançado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Processo</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      value={selectedProcesso}
                      onChange={(e) => setSelectedProcesso(e.target.value)}
                    >
                      <option value="">Selecione um processo</option>
                      {processos?.map((proc: Processo) => (
                        <option key={proc.id} value={proc.id}>
                          {proc.numero}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Título</label>
                    <Input value={tituloDocumento} onChange={(e) => setTituloDocumento(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Descrição</label>
                  <Textarea value={descricaoDocumento} onChange={(e) => setDescricaoDocumento(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Conteúdo</label>
                  <Textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className="min-h-[300px] font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleGerar} disabled={!selectedModelo || !selectedProcesso}>
                    <Wand2 className="h-4 w-4 mr-2" /> Gerar com IA Jurídica
                  </Button>
                  <Button variant="outline" onClick={handleSalvarConteudo} disabled={!documentoAtual}>
                    Salvar rascunho
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatus('ANEXADO')}
                    disabled={!documentoAtual}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como anexado ao processo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary-600" /> Documentos do processo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-y-auto">
                  {documentosFiltrados?.length ? (
                    documentosFiltrados.map((doc) => (
                      <div
                        key={doc.id}
                        className="border rounded-md p-3 hover:border-primary-300 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold">{doc.titulo}</div>
                          <div className="text-xs text-gray-500">
                            {doc.processo?.numero} • {formatDate(doc.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Badge variant="secondary">{doc.status}</Badge>
                            {doc.template && <Badge variant="outline">Modelo: {doc.template.nome}</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setDocumentoAtual(doc)}>
                            Abrir
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownload(doc.id, doc.titulo)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum documento ainda.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-primary-600" /> Histórico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-y-auto">
                  {historicoQuery.isLoading ? (
                    <LoadingSpinner />
                  ) : historicoQuery.data?.length ? (
                    historicoQuery.data.map((item) => (
                      <div key={item.id} className="border rounded-md p-3">
                        <div className="flex justify-between">
                          <span className="font-semibold">{item.acao}</span>
                          <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.user?.nome} ({item.user?.email}) • Status: {item.status}
                        </div>
                        {item.detalhe && <p className="text-sm mt-1">{item.detalhe}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Selecione um documento para ver histórico.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
