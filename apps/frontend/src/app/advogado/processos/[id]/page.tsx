'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative as Select } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Upload, Download, Trash2, Send, Plus, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useProcesso, useUpdateProcesso } from '@/hooks/useProcessos';
import { useClientes } from '@/hooks/useClientes';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate, formatCPF } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { ModalParteProcessual, ParteProcessualData } from '@/components/processos/ModalParteProcessual';
import { ListaPartes } from '@/components/processos/ListaPartes';
import { DocumentosGerados } from '@/components/processos/DocumentosGerados';
import { usePartesExistentes } from '@/hooks/usePartes';
import { useQueryClient } from '@tanstack/react-query';
import { ModalCaptchaProjudi } from '@/components/processos/ModalCaptchaProjudi';
import {
  useIniciarCaptchaProjudi,
  useConsultarComCaptcha
} from '@/hooks/useProcessos';

interface ProcessoFormData {
  tipoAcao: string;
  areaDireito: string;
  justica: string;
  instancia: string;
  comarca: string;
  foro: string;
  vara: string;
  uf: string;
  objetoAcao: string;
  pedidoPrincipal: string;
  valorCausa: string;
  valorHonorarios: string;
  dataDistribuicao: string;
  proximoPrazo: string;
  descricaoPrazo: string;
  status: string;
  prioridade: string;
  observacoes: string;
  descricao: string;
  partes?: ParteProcessualData[];
}

export default function ProcessoDetalhesPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: processo, isLoading } = useProcesso(id);
  const { data: clientesData } = useClientes({ limit: 100 });
  const { data: partesData } = usePartesExistentes();
  const updateMutation = useUpdateProcesso();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('basico');
  const [activeTab, setActiveTab] = useState('info');
  const [isParteModalOpen, setIsParteModalOpen] = useState(false);
  const [parteEditIndex, setParteEditIndex] = useState<number | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  const [infoMovimentacoes, setInfoMovimentacoes] = useState<{
    dataConsulta?: string;
    dataConsultaAnterior?: string | null;
    totalNovas?: number;
  }>({});
  const [tabValidation, setTabValidation] = useState<Record<string, boolean>>({
    basico: false,
    localizacao: false,
    partes: false,
    informacoes: false,
    controle: false,
  });

  const [formData, setFormData] = useState<ProcessoFormData>({
    tipoAcao: '',
    areaDireito: '',
    justica: '',
    instancia: '',
    comarca: '',
    foro: '',
    vara: '',
    uf: '',
    objetoAcao: '',
    pedidoPrincipal: '',
    valorCausa: '',
    valorHonorarios: '',
    dataDistribuicao: '',
    proximoPrazo: '',
    descricaoPrazo: '',
    status: '',
    prioridade: '',
    observacoes: '',
    descricao: '',
    partes: [],
  });

  const [mensagem, setMensagem] = useState('');
  const [uploading, setUploading] = useState(false);

  // Estados PROJUDI
  const [isCaptchaModalOpen, setIsCaptchaModalOpen] = useState(false);
  const [captchaData, setCaptchaData] = useState<any>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Hooks PROJUDI
  const iniciarCaptchaMutation = useIniciarCaptchaProjudi();
  const consultarCaptchaMutation = useConsultarComCaptcha();

  // FASE 1.4: Reset correto do formulário quando modal fechar
  useEffect(() => {
    if (!isEditOpen) {
      setCurrentTab('basico');
      setParteEditIndex(null);
    }
  }, [isEditOpen]);

  // Preencher formData quando processo for carregado
  useEffect(() => {
    if (processo) {
      const data: ProcessoFormData = {
        tipoAcao: processo.tipoAcao || '',
        areaDireito: processo.areaDireito || '',
        justica: processo.justica || '',
        instancia: processo.instancia || '',
        comarca: processo.comarca || '',
        foro: processo.foro || '',
        vara: processo.vara || '',
        uf: processo.uf || '',
        objetoAcao: processo.objetoAcao || '',
        pedidoPrincipal: processo.pedidoPrincipal || '',
        valorCausa: processo.valorCausa ? `R$ ${processo.valorCausa.toFixed(2).replace('.', ',')}` : '',
        valorHonorarios: processo.valorHonorarios ? `R$ ${processo.valorHonorarios.toFixed(2).replace('.', ',')}` : '',
        dataDistribuicao: processo.dataDistribuicao ? new Date(processo.dataDistribuicao).toISOString().split('T')[0] : '',
        proximoPrazo: processo.proximoPrazo ? new Date(processo.proximoPrazo).toISOString().split('T')[0] : '',
        descricaoPrazo: processo.descricaoPrazo || '',
        status: processo.status || '',
        prioridade: processo.prioridade || '',
        observacoes: processo.observacoes || '',
        descricao: processo.descricao || '',
        partes: processo.partes || [],
      };
      setFormData(data);
    }
  }, [processo]);

  // FASE 1.3: Validação em tempo real
  useEffect(() => {
    validateTabs();
  }, [formData]);

  const validateTabs = () => {
    const validation: Record<string, boolean> = {
      basico: !!(formData.tipoAcao && formData.areaDireito),
      localizacao: !!(formData.justica && formData.instancia && formData.uf),
      partes: true, // Validação de partes será feita separadamente
      informacoes: !!formData.objetoAcao,
      controle: true, // Todos os campos de controle são opcionais
    };
    setTabValidation(validation);
  };

  const validatePartes = () => {
    if (!formData.partes || formData.partes.length === 0) return false;
    const hasAutor = formData.partes.some(p => p.tipoParte === 'AUTOR');
    const hasReu = formData.partes.some(p => p.tipoParte === 'REU');
    return hasAutor && hasReu;
  };

  const getTabsCompleted = () => {
    const partesValid = validatePartes();
    const completed = Object.values(tabValidation).filter(Boolean).length + (partesValid ? 1 : 0);
    return completed;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!processo) {
    return <div>Processo não encontrado</div>;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    const camposObrigatorios = [
      { campo: 'tipoAcao', nome: 'Tipo de Ação', tab: 'basico' },
      { campo: 'areaDireito', nome: 'Área do Direito', tab: 'basico' },
      { campo: 'justica', nome: 'Justiça', tab: 'localizacao' },
      { campo: 'instancia', nome: 'Instância', tab: 'localizacao' },
      { campo: 'uf', nome: 'UF', tab: 'localizacao' },
      { campo: 'objetoAcao', nome: 'Objeto da Ação', tab: 'informacoes' },
    ];

    for (const { campo, nome, tab } of camposObrigatorios) {
      if (!formData[campo as keyof ProcessoFormData]) {
        toast({ title: 'Campo obrigatório', description: `Preencha o campo "${nome}" na aba correspondente`, variant: 'error' });
        setCurrentTab(tab);
        return;
      }
    }

    // FASE 2.2: Validação de partes
    if (!validatePartes()) {
      toast({
        title: 'Partes incompletas',
        description: 'É necessário ter pelo menos 1 Autor e 1 Réu no processo',
        variant: 'error'
      });
      setCurrentTab('partes');
      return;
    }

    try {
      const payload = {
        ...formData,
        valorCausa: formData.valorCausa ? parseFloat(formData.valorCausa.replace(/[^\d,]/g, '').replace(',', '.')) : null,
        valorHonorarios: formData.valorHonorarios ? parseFloat(formData.valorHonorarios.replace(/[^\d,]/g, '').replace(',', '.')) : null,
        dataDistribuicao: formData.dataDistribuicao || null,
        proximoPrazo: formData.proximoPrazo || null,
      };

      await updateMutation.mutateAsync({
        id,
        data: payload,
      });
      toast({ title: 'Sucesso', description: 'Processo atualizado com sucesso', variant: 'success' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao atualizar processo', variant: 'error' });
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '');
    if (!num) return '';
    const formatted = (parseInt(num) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `R$ ${formatted}`;
  };

  // FASE 2.1: Remover window.location.reload()
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('arquivo', file);
    formData.append('processoId', id);
    formData.append('titulo', file.name);

    try {
      await api.post('/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: 'Sucesso', description: 'Documento enviado', variant: 'success' });
      // FASE 2.1: Usar invalidateQueries ao invés de reload
      queryClient.invalidateQueries({ queryKey: ['processo', id] });
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao enviar documento', variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!mensagem.trim()) return;

    try {
      await api.post('/mensagens', {
        processoId: id,
        conteudo: mensagem,
      });
      setMensagem('');
      toast({ title: 'Sucesso', description: 'Mensagem enviada', variant: 'success' });
      // FASE 2.1: Usar invalidateQueries ao invés de reload
      queryClient.invalidateQueries({ queryKey: ['processo', id] });
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao enviar mensagem', variant: 'error' });
    }
  };

  const handleAddParte = (parte: ParteProcessualData) => {
    if (parteEditIndex !== null) {
      const novasPartes = [...(formData.partes || [])];
      novasPartes[parteEditIndex] = parte;
      setFormData({ ...formData, partes: novasPartes });
      setParteEditIndex(null);
    } else {
      setFormData({ ...formData, partes: [...(formData.partes || []), parte] });
    }
    setIsParteModalOpen(false);
  };

  const handleEditParte = (parte: ParteProcessualData, index: number) => {
    setParteEditIndex(index);
    setIsParteModalOpen(true);
  };

  const handleRemoveParte = (index: number) => {
    const novasPartes = (formData.partes || []).filter((_, i) => i !== index);
    setFormData({ ...formData, partes: novasPartes });
  };

  // FASE 2.4: Salvar partes separadamente
  const handleSavePartes = async () => {
    try {
      await api.put(`/processos/${id}/partes`, {
        partes: formData.partes,
      });
      toast({ title: 'Sucesso', description: 'Partes atualizadas com sucesso', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['processo', id] });
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao atualizar partes', variant: 'error' });
    }
  };

  // =========================
  // FUNCOES PROJUDI
  // =========================

  const getProjudiErrorMessage = (error: any, fallback: string) => {
    const errorPayload = error?.response?.data?.error;
    if (typeof errorPayload === 'string') {
      return errorPayload;
    }
    if (errorPayload?.message) {
      return errorPayload.message;
    }
    if (error?.message) {
      return error.message;
    }
    return fallback;
  };

  /**
   * Inicia consulta PROJUDI (scraping assistido)
   */
  const handleAtualizarManual = async () => {
    if (!processo || processo.uf !== 'PR') {
      toast({
        title: 'Nao disponivel',
        description: 'Atualizacao PROJUDI disponivel apenas para processos do Parana (PR)',
        variant: 'error'
      });
      return;
    }

    setCaptchaLoading(true);
    setCaptchaError(null);

    try {
      const resultado = await iniciarCaptchaMutation.mutateAsync(id);
      setCaptchaData(resultado);
      setIsCaptchaModalOpen(true);
    } catch (error: any) {
      const mensagemErro = getProjudiErrorMessage(error, 'Erro ao iniciar consulta');
      toast({
        title: 'Erro',
        description: mensagemErro,
        variant: 'error'
      });
    } finally {
      setCaptchaLoading(false);
    }
  };

  /**
   * Consulta PROJUDI com CAPTCHA resolvido
   */
  const handleConsultarComCaptcha = async (captchaResposta: string) => {
    if (!captchaData) return;

    setCaptchaError(null);

    try {
      const resultado = await consultarCaptchaMutation.mutateAsync({
        processoId: id,
        sessionId: captchaData.sessionId,
        captchaResposta
      });

      toast({
        title: 'Sucesso!',
        description: `Processo atualizado com ${resultado.camposAtualizados?.length || 0} campos`,
        variant: 'success'
      });

      setIsCaptchaModalOpen(false);
      setCaptchaData(null);
    } catch (error: any) {
      const mensagemErro = getProjudiErrorMessage(error, 'Erro ao consultar');
      setCaptchaError(mensagemErro);

      // Nao fecha o modal em caso de erro de CAPTCHA
      if (mensagemErro.toLowerCase().includes('captcha')) {
        return;
      }

      toast({
        title: 'Erro',
        description: mensagemErro,
        variant: 'error'
      });
    }
  };

  /**
   * Carregar movimentações do PROJUDI
   */
  const carregarMovimentacoes = async () => {
    setLoadingMovimentacoes(true);
    try {
      const response = await api.get(`/projudi/processos/${id}/movimentacoes`);

      // Sempre atualiza o estado, mesmo que vazio
      setMovimentacoes(response.data.movimentacoes || []);
      setInfoMovimentacoes({
        dataConsulta: response.data.dataConsulta || null,
        dataConsultaAnterior: response.data.dataConsultaAnterior || null,
        totalNovas: response.data.totalNovas || 0
      });

      // Mostrar mensagem se não houver movimentações
      if (!response.data.movimentacoes || response.data.movimentacoes.length === 0) {
        // Não mostra toast, apenas deixa a UI mostrar que está vazio
        console.log('Nenhuma movimentação encontrada');
      } else if (response.data.totalNovas > 0) {
        // Mostrar toast se houver novas movimentações
        toast({
          title: 'Novas Movimentações!',
          description: `${response.data.totalNovas} nova(s) movimentação(ões) desde a última consulta.`,
          variant: 'success'
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar movimentações:', error);
      setMovimentacoes([]);
      // Não mostra toast de erro, apenas loga
    } finally {
      setLoadingMovimentacoes(false);
    }
  };

  const statusColors: Record<string, any> = {
    EM_ANDAMENTO: 'info',
    SUSPENSO: 'warning',
    CONCLUIDO: 'success',
    ARQUIVADO: 'default',
  };

  // FASE 2.3: Indicador visual de progresso
  const TabIndicator = ({ isValid }: { isValid: boolean }) => (
    isValid ? (
      <Check className="h-4 w-4 text-green-600 ml-2 pointer-events-none" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500 ml-2 pointer-events-none" />
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/advogado/processos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{processo.numero}</h1>
          <p className="text-gray-500">{processo.cliente.user.nome}</p>
        </div>
        <Badge variant={statusColors[processo.status]}>
          {processo.status.replace('_', ' ')}
        </Badge>

        {/* Botoes de acao */}
        <div className="flex gap-2">
          <Button onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Processo
          </Button>

          {processo.uf === 'PR' && (
            <Button
              onClick={handleAtualizarManual}
              disabled={captchaLoading}
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${captchaLoading ? 'animate-spin' : ''}`}
              />
              Atualizar PROJUDI
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (value === 'movimentacoes' && movimentacoes.length === 0 && !loadingMovimentacoes) {
          carregarMovimentacoes().catch(err => {
            console.error('Erro ao carregar movimentações:', err);
          });
        }
      }}>
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="partes">
            Partes ({processo.partes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            Movimentações ({movimentacoes.length})
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos ({processo.documentos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documentos-gerados">
            Documentos Gerados ({processo.documentosProcesso?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="mensagens">
            Mensagens ({processo.mensagens?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Processo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Número do Processo</Label>
                  <Input value={processo.numero} disabled />
                </div>
                <div>
                  <Label>Data de Início</Label>
                  <Input value={formatDate(processo.dataInicio)} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={processo.cliente.user.nome} disabled />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={formatCPF(processo.cliente.cpf)} disabled />
                </div>
              </div>

              {/* FASE 1.2: Campos read-only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Ação</Label>
                  <Input value={processo.tipoAcao || '-'} disabled />
                </div>
                <div>
                  <Label>Área do Direito</Label>
                  <Input value={processo.areaDireito || '-'} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Justiça</Label>
                  <Input value={processo.justica || '-'} disabled />
                </div>
                <div>
                  <Label>Instância</Label>
                  <Input value={processo.instancia || '-'} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Comarca</Label>
                  <Input value={processo.comarca || '-'} disabled />
                </div>
                <div>
                  <Label>Foro</Label>
                  <Input value={processo.foro || '-'} disabled />
                </div>
                <div>
                  <Label>Vara</Label>
                  <Input value={processo.vara || '-'} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Input value={processo.status.replace('_', ' ')} disabled />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input value={processo.prioridade?.replace('_', ' ') || '-'} disabled />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea value={processo.descricao || '-'} disabled rows={4} />
              </div>

              <div>
                <Label>Objeto da Ação</Label>
                <Textarea value={processo.objetoAcao || '-'} disabled rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FASE 2.4: Nova aba de Partes com edição */}
        <TabsContent value="partes">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Partes do Processo</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParteEditIndex(null);
                      setIsParteModalOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Parte
                  </Button>
                  <Button onClick={handleSavePartes}>
                    Salvar Partes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!validatePartes() && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">Atenção!</p>
                    <p className="text-sm text-yellow-700">
                      É necessário ter pelo menos 1 Autor e 1 Réu cadastrado.
                    </p>
                  </div>
                </div>
              )}
              <ListaPartes
                partes={formData.partes || []}
                onEdit={handleEditParte}
                onRemove={handleRemoveParte}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Movimentações do Processo</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarMovimentacoes}
                    disabled={loadingMovimentacoes}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingMovimentacoes ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>

                {/* Info da última consulta */}
                {infoMovimentacoes.dataConsulta && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Última consulta:</span>
                      <span>{formatDate(infoMovimentacoes.dataConsulta)}</span>
                    </div>
                    {infoMovimentacoes.dataConsultaAnterior && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Consulta anterior:</span>
                        <span>{formatDate(infoMovimentacoes.dataConsultaAnterior)}</span>
                      </div>
                    )}
                    {infoMovimentacoes.totalNovas! > 0 && (
                      <Badge variant="success" className="ml-auto">
                        {infoMovimentacoes.totalNovas} nova(s)
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingMovimentacoes ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : movimentacoes.length > 0 ? (
                <div className="space-y-4">
                  {movimentacoes.map((mov: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{mov.sequencial || index + 1}
                            </Badge>
                            <span className="text-sm font-medium text-gray-600">
                              {mov.data}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 mt-1">
                            {mov.evento}
                          </h4>
                          {mov.descricao && (
                            <p className="text-sm text-gray-600 mt-1">
                              {mov.descricao}
                            </p>
                          )}
                          {mov.movimentadoPor && (
                            <p className="text-xs text-gray-500 mt-2">
                              Movimentado por: {mov.movimentadoPor}
                            </p>
                          )}
                          {mov.documentos && mov.documentos.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">
                                📎 Documentos anexados ({mov.documentos.length}):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {mov.documentos.map((doc: any, docIndex: number) => (
                                  <a
                                    key={docIndex}
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs transition-colors"
                                  >
                                    <Download className="h-3 w-3" />
                                    {doc.titulo}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {mov.tipoMovimento && (
                          <Badge variant="secondary">
                            {mov.tipoMovimento}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma movimentação encontrada.</p>
                  <p className="text-sm mt-2">
                    Faça uma consulta PROJUDI para carregar as movimentações.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Documentos</CardTitle>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? 'Enviando...' : 'Upload'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {processo.documentos && processo.documentos.length > 0 ? (
                <div className="space-y-3">
                  {processo.documentos.map((doc: any) => (
                    <div key={doc.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.titulo}</p>
                        <p className="text-sm text-gray-500">
                          {doc.tipo} • {(doc.tamanho / 1024).toFixed(2)} KB • {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const response = await api.get(`/documentos/${doc.id}/download`, {
                              responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = doc.titulo;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum documento anexado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos-gerados">
          <DocumentosGerados
            processoId={id}
            documentos={processo.documentosProcesso || []}
          />
        </TabsContent>

        <TabsContent value="mensagens">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {processo.mensagens && processo.mensagens.length > 0 ? (
                  processo.mensagens.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        msg.remetente === 'Advogado'
                          ? 'bg-primary-50 ml-12'
                          : 'bg-gray-100 mr-12'
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                        <span className="font-semibold text-sm">{msg.remetente}</span>
                        <span className="text-xs text-gray-500">{formatDate(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm">{msg.conteudo}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">Nenhuma mensagem ainda</p>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FASE 1.1: Modal de Edição Completa */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Processo - {processo.numero}</DialogTitle>
            {/* FASE 2.3: Badge de progresso */}
            <p className="text-sm text-gray-500 mt-2">
              Progresso: {getTabsCompleted()}/5 abas completas
            </p>
          </DialogHeader>

          <form onSubmit={handleUpdate}>
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basico" className="flex items-center">
                  Básico
                  <TabIndicator isValid={tabValidation.basico} />
                </TabsTrigger>
                <TabsTrigger value="localizacao" className="flex items-center">
                  Localização
                  <TabIndicator isValid={tabValidation.localizacao} />
                </TabsTrigger>
                <TabsTrigger value="partes" className="flex items-center">
                  Partes
                  <TabIndicator isValid={validatePartes()} />
                </TabsTrigger>
                <TabsTrigger value="informacoes" className="flex items-center">
                  Informações
                  <TabIndicator isValid={tabValidation.informacoes} />
                </TabsTrigger>
                <TabsTrigger value="controle" className="flex items-center">
                  Controle
                  <TabIndicator isValid={tabValidation.controle} />
                </TabsTrigger>
              </TabsList>

              {/* Aba 1: Dados Básicos */}
              <TabsContent value="basico" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="numero">Número do Processo</Label>
                  <Input
                    id="numero"
                    value={processo.numero}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">O número do processo não pode ser alterado</p>
                </div>

                <div>
                  <Label htmlFor="tipoAcao">Tipo de Ação *</Label>
                  <Select
                    id="tipoAcao"
                    value={formData.tipoAcao}
                    onChange={(e) => setFormData({ ...formData, tipoAcao: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="Ação Civil Pública">Ação Civil Pública</option>
                    <option value="Ação de Cobrança">Ação de Cobrança</option>
                    <option value="Ação de Indenização">Ação de Indenização</option>
                    <option value="Ação Trabalhista">Ação Trabalhista</option>
                    <option value="Execução">Execução</option>
                    <option value="Mandado de Segurança">Mandado de Segurança</option>
                    <option value="Outros">Outros</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="areaDireito">Área do Direito *</Label>
                  <Select
                    id="areaDireito"
                    value={formData.areaDireito}
                    onChange={(e) => setFormData({ ...formData, areaDireito: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="Cível">Cível</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Penal">Penal</option>
                    <option value="Tributário">Tributário</option>
                    <option value="Família">Família</option>
                    <option value="Consumidor">Consumidor</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Previdenciário">Previdenciário</option>
                  </Select>
                </div>
              </TabsContent>

              {/* Aba 2: Localização Judicial */}
              <TabsContent value="localizacao" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="justica">Justiça *</Label>
                    <Select
                      id="justica"
                      value={formData.justica}
                      onChange={(e) => setFormData({ ...formData, justica: e.target.value })}
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="ESTADUAL">Estadual</option>
                      <option value="FEDERAL">Federal</option>
                      <option value="TRABALHO">Trabalho</option>
                      <option value="ELEITORAL">Eleitoral</option>
                      <option value="MILITAR">Militar</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="instancia">Instância *</Label>
                    <Select
                      id="instancia"
                      value={formData.instancia}
                      onChange={(e) => setFormData({ ...formData, instancia: e.target.value })}
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="PRIMEIRA">1ª Instância</option>
                      <option value="SEGUNDA">2ª Instância</option>
                      <option value="SUPERIOR">Superior</option>
                      <option value="SUPREMO">Supremo</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="comarca">Comarca</Label>
                    <Input
                      id="comarca"
                      value={formData.comarca}
                      onChange={(e) => setFormData({ ...formData, comarca: e.target.value })}
                      placeholder="Nome da comarca"
                    />
                  </div>

                  <div>
                    <Label htmlFor="foro">Foro</Label>
                    <Input
                      id="foro"
                      value={formData.foro}
                      onChange={(e) => setFormData({ ...formData, foro: e.target.value })}
                      placeholder="Nome do foro"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vara">Vara</Label>
                    <Input
                      id="vara"
                      value={formData.vara}
                      onChange={(e) => setFormData({ ...formData, vara: e.target.value })}
                      placeholder="Ex: 1ª Vara Cível"
                    />
                  </div>

                  <div>
                    <Label htmlFor="uf">UF *</Label>
                    <Select
                      id="uf"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                      required
                    >
                      <option value="">Selecione</option>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 3: Partes Processuais */}
              <TabsContent value="partes" className="space-y-4 mt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Partes do Processo</h3>
                    {!validatePartes() && (
                      <p className="text-sm text-red-600 mt-1">
                        * É necessário ter pelo menos 1 Autor e 1 Réu
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setParteEditIndex(null);
                      setIsParteModalOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Parte
                  </Button>
                </div>

                <ListaPartes
                  partes={formData.partes || []}
                  onEdit={handleEditParte}
                  onRemove={handleRemoveParte}
                />
              </TabsContent>

              {/* Aba 4: Informações Processuais */}
              <TabsContent value="informacoes" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="objetoAcao">Objeto da Ação *</Label>
                  <Textarea
                    id="objetoAcao"
                    value={formData.objetoAcao}
                    onChange={(e) => setFormData({ ...formData, objetoAcao: e.target.value })}
                    rows={4}
                    placeholder="Descreva o objeto da ação"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pedidoPrincipal">Pedido Principal</Label>
                  <Textarea
                    id="pedidoPrincipal"
                    value={formData.pedidoPrincipal}
                    onChange={(e) => setFormData({ ...formData, pedidoPrincipal: e.target.value })}
                    rows={3}
                    placeholder="Descreva o pedido principal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valorCausa">Valor da Causa</Label>
                    <Input
                      id="valorCausa"
                      value={formData.valorCausa}
                      onChange={(e) => setFormData({ ...formData, valorCausa: formatCurrency(e.target.value) })}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="valorHonorarios">Valor dos Honorários</Label>
                    <Input
                      id="valorHonorarios"
                      value={formData.valorHonorarios}
                      onChange={(e) => setFormData({ ...formData, valorHonorarios: formatCurrency(e.target.value) })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 5: Controle e Prazos */}
              <TabsContent value="controle" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dataDistribuicao">Data de Distribuição</Label>
                    <Input
                      id="dataDistribuicao"
                      type="date"
                      value={formData.dataDistribuicao}
                      onChange={(e) => setFormData({ ...formData, dataDistribuicao: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="proximoPrazo">Próximo Prazo</Label>
                    <Input
                      id="proximoPrazo"
                      type="date"
                      value={formData.proximoPrazo}
                      onChange={(e) => setFormData({ ...formData, proximoPrazo: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="descricaoPrazo">Descrição do Prazo</Label>
                    <Input
                      id="descricaoPrazo"
                      value={formData.descricaoPrazo}
                      onChange={(e) => setFormData({ ...formData, descricaoPrazo: e.target.value })}
                      placeholder="Ex: Apresentar contestação"
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                    >
                      <option value="EM_ANDAMENTO">Em Andamento</option>
                      <option value="SUSPENSO">Suspenso</option>
                      <option value="CONCLUIDO">Concluído</option>
                      <option value="ARQUIVADO">Arquivado</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select
                      id="prioridade"
                      value={formData.prioridade}
                      onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENTE">Urgente</option>
                      <option value="MUITO_URGENTE">Muito Urgente</option>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      placeholder="Observações gerais sobre o processo"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={4}
                      placeholder="Descrição detalhada do processo"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar/Editar Parte */}
      <ModalParteProcessual
        open={isParteModalOpen}
        onOpenChange={setIsParteModalOpen}
        onSave={handleAddParte}
        parteEdit={parteEditIndex !== null ? (formData.partes || [])[parteEditIndex] : undefined}
        clientes={clientesData?.clientes || []}
        partesExistentes={partesData?.partes || []}
      />

      {/* Modal CAPTCHA PROJUDI */}
      <ModalCaptchaProjudi
        open={isCaptchaModalOpen}
        onOpenChange={(open) => {
          setIsCaptchaModalOpen(open);
          if (!open) {
            setCaptchaData(null);
            setCaptchaError(null);
          }
        }}
        onConsultar={handleConsultarComCaptcha}
        captchaData={captchaData}
        loading={captchaLoading}
        error={captchaError}
      />
    </div>
  );
}









