'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectNative as Select } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Download, FileText, Copy, History, Settings, Save } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AdvancedRichTextEditor } from '@/components/shared/AdvancedRichTextEditor';
import SelectCliente from '@/components/advogado/SelectCliente';
import SelectProcesso from '@/components/advogado/SelectProcesso';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

type Modelo = {
  id: string;
  nome: string;
  descricao?: string;
  conteudo: string;
};

export default function IAJuridicaPage() {
  const [tipoPeca, setTipoPeca] = useState('Petição Inicial');
  const [contexto, setContexto] = useState('');
  const [fundamentosLegais, setFundamentosLegais] = useState('');
  const [pedidos, setPedidos] = useState('');
  const [partes, setPartes] = useState('');
  const [conteudoGerado, setConteudoGerado] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [processoId, setProcessoId] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [processoSelecionado, setProcessoSelecionado] = useState<any>(null);
  const [formatoExportar, setFormatoExportar] = useState('pdf');
  const [modeloBaseId, setModeloBaseId] = useState('');
  const [documentoId, setDocumentoId] = useState(''); // ID do documento salvo
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modelos } = useQuery({
    queryKey: ['documentos', 'modelos'],
    queryFn: async () => {
      const response = await api.get('/documentos/modelos');
      return response.data as Modelo[];
    },
  });

  const tiposPeca = [
    'Petição Inicial',
    'Contestação',
    'Recurso',
    'Agravo',
    'Apelação',
    'Contrato',
    'Parecer',
    'Outro',
  ];

  useEffect(() => {
    if (modeloBaseId && modelos) {
      const modeloSelecionado = modelos.find(m => m.id === modeloBaseId);
      if (modeloSelecionado) {
        setContexto(modeloSelecionado.conteudo);
      }
    }
  }, [modeloBaseId, modelos]);

  const handleGenerate = async () => {
    // Validações
    if (!modeloBaseId) {
      toast({ title: 'Atenção', description: 'Selecione um modelo base', variant: 'error' });
      return;
    }

    if (!clienteId) {
      toast({ title: 'Atenção', description: 'Selecione um cliente', variant: 'error' });
      return;
    }

    if (!processoId) {
      toast({ title: 'Atenção', description: 'Selecione um processo', variant: 'error' });
      return;
    }

    if (!contexto.trim()) {
      toast({ title: 'Atenção', description: 'Preencha o contexto', variant: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post('/ia/gerar-peca', {
        tipoPeca,
        contexto,
        fundamentosLegais,
        pedidos,
        partes: partes.split('\n').filter(p => p.trim()),
        clienteId,
        processoId,
        templateId: modeloBaseId
      });
      setConteudoGerado(response.data.conteudo);
      toast({ title: 'Sucesso', description: 'Peça gerada com sucesso! Agora salve o documento.', variant: 'success' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao gerar peça. Verifique as configurações de IA.',
        variant: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSalvarDocumento = async () => {
    if (!conteudoGerado) {
      toast({ title: 'Atenção', description: 'Gere um documento primeiro', variant: 'error' });
      return;
    }

    if (!clienteId || !processoId) {
      toast({ title: 'Atenção', description: 'Cliente e processo são obrigatórios', variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/documentos-processo', {
        processoId,
        clienteId,
        templateId: modeloBaseId || null,
        titulo: tipoPeca,
        conteudoHTML: conteudoGerado
      });

      setDocumentoId(response.data.id);

      // Invalidar a query do processo para atualizar a lista de documentos
      queryClient.invalidateQueries({ queryKey: ['processo', processoId] });

      toast({
        title: 'Sucesso',
        description: 'Documento salvo com sucesso! Agora você pode exportar.',
        variant: 'success'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao salvar documento',
        variant: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (formato: string) => {
    if (!documentoId) {
      toast({
        title: 'Atenção',
        description: 'Salve o documento antes de exportar',
        variant: 'error'
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await api.post(
        `/documentos-processo/${documentoId}/exportar`,
        { formato },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tipoPeca}.${formato}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Sucesso', description: `Documento exportado em ${formato.toUpperCase()}`, variant: 'success' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao exportar documento',
        variant: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      // Criar um elemento temporário para extrair o texto sem HTML
      const temp = document.createElement('div');
      temp.innerHTML = conteudoGerado;
      const textoPlano = temp.textContent || temp.innerText || '';

      // Copiar tanto HTML quanto texto plano
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([conteudoGerado], { type: 'text/html' }),
          'text/plain': new Blob([textoPlano], { type: 'text/plain' }),
        }),
      ]);

      toast({ title: 'Copiado', description: 'Documento copiado com formatação', variant: 'success' });
    } catch (error) {
      // Fallback para texto simples se clipboard API não suportar HTML
      const temp = document.createElement('div');
      temp.innerHTML = conteudoGerado;
      const textoPlano = temp.textContent || temp.innerText || '';
      await navigator.clipboard.writeText(textoPlano);
      toast({ title: 'Copiado', description: 'Texto copiado para área de transferência', variant: 'success' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IA Jurídica</h1>
          <p className="text-gray-500">Geração automática de peças jurídicas com Inteligência Artificial</p>
        </div>
        <div className="flex gap-2">
          <Link href="/advogado/ia-juridica/historico">
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
          </Link>
          <Link href="/advogado/configuracoes/ia">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar - Formulário */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tipo">Tipo de Peça</Label>
              <Select
                id="tipo"
                value={tipoPeca}
                onChange={(e) => setTipoPeca(e.target.value)}
              >
                {tiposPeca.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="modelo">Modelo Base (Opcional)</Label>
              <Select
                id="modelo"
                value={modeloBaseId}
                onChange={(e) => setModeloBaseId(e.target.value)}
              >
                <option value="">Nenhum - Gerar do zero</option>
                {modelos?.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>
                    {modelo.nome}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione um modelo da biblioteca para usar como base
              </p>
            </div>

            <SelectCliente
              value={clienteId}
              onChange={(id, cliente) => {
                setClienteId(id);
                setClienteSelecionado(cliente);
              }}
            />

            <SelectProcesso
              value={processoId}
              clienteId={clienteId}
              onChange={(id, processo) => {
                setProcessoId(id);
                setProcessoSelecionado(processo);
              }}
            />

            <div>
              <Label htmlFor="contexto">Contexto / Descrição *</Label>
              <Textarea
                id="contexto"
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="Descreva o contexto da peça jurídica..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="fundamentos">Fundamentos Legais</Label>
              <Textarea
                id="fundamentos"
                value={fundamentosLegais}
                onChange={(e) => setFundamentosLegais(e.target.value)}
                placeholder="Art. 123 do CPC, Lei 1234/2020..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="pedidos">Pedidos</Label>
              <Textarea
                id="pedidos"
                value={pedidos}
                onChange={(e) => setPedidos(e.target.value)}
                placeholder="Liste os pedidos..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="partes">Partes (uma por linha)</Label>
              <Textarea
                id="partes"
                value={partes}
                onChange={(e) => setPartes(e.target.value)}
                placeholder="Autor: João da Silva&#10;Réu: Maria Santos"
                rows={3}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !contexto.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Gerando...</span>
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Gerar Peça com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {tipoPeca}
              </CardTitle>
              {conteudoGerado && (
                <div className="flex gap-2 items-center">
                  {!documentoId && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSalvarDocumento}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Salvar
                        </>
                      )}
                    </Button>
                  )}
                  {documentoId && (
                    <>
                      <Select
                        value={formatoExportar}
                        onChange={(e) => setFormatoExportar(e.target.value)}
                        className="w-28"
                      >
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                        <option value="txt">TXT</option>
                        <option value="rtf">RTF</option>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleExport(formatoExportar)}
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Exportar
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {clienteSelecionado && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <p className="font-semibold text-blue-900">Cliente: {clienteSelecionado.user.nome}</p>
                {processoSelecionado && (
                  <p className="text-blue-700">Processo: {processoSelecionado.numero}</p>
                )}
              </div>
            )}
            <AdvancedRichTextEditor
              content={conteudoGerado}
              onChange={(html) => setConteudoGerado(html)}
              placeholder="O conteúdo gerado pela IA aparecerá aqui. Você poderá editar e formatar o texto antes de exportar."
              minHeight="600px"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
