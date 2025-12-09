'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative as Select } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Check, AlertCircle, Trash2 } from 'lucide-react';
import { useProcessos, useCreateProcesso, useDeleteProcesso } from '@/hooks/useProcessos';
import { useClientes } from '@/hooks/useClientes';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate, maskProcessoCNJ, validarProcessoCNJ } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { ModalParteProcessual, ParteProcessualData } from '@/components/processos/ModalParteProcessual';
import { ListaPartes } from '@/components/processos/ListaPartes';
import { usePartesExistentes } from '@/hooks/usePartes';

interface ProcessoFormData {
  numero: string;
  clienteId: string;

  // Classificação
  tipoAcao: string;
  areaDireito: string;

  // Localização Judicial
  justica: string;
  instancia: string;
  comarca: string;
  foro: string;
  vara: string;
  uf: string;

  // Informações Processuais
  objetoAcao: string;
  pedidoPrincipal: string;
  valorCausa: string;
  valorHonorarios: string;

  // Datas
  dataDistribuicao: string;
  proximoPrazo: string;
  descricaoPrazo: string;

  // Controle
  status: string;
  prioridade: string;
  observacoes: string;

  // Partes
  partes: ParteProcessualData[];
}

const INITIAL_FORM_DATA: ProcessoFormData = {
  numero: '',
  clienteId: '',
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
  status: 'EM_ANDAMENTO',
  prioridade: 'NORMAL',
  observacoes: '',
  partes: [],
};

export default function ProcessosPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<ProcessoFormData>(INITIAL_FORM_DATA);
  const [isParteModalOpen, setIsParteModalOpen] = useState(false);
  const [parteEditIndex, setParteEditIndex] = useState<number | null>(null);
  const [currentTab, setCurrentTab] = useState('basico');
  const [tabValidation, setTabValidation] = useState<Record<string, boolean>>({
    basico: false,
    localizacao: false,
    partes: false,
    informacoes: false,
    controle: false,
  });

  const { data, isLoading } = useProcessos({ status: statusFilter as any });
  const { data: clientesData } = useClientes({ limit: 100 });
  const { data: partesData } = usePartesExistentes();
  const createMutation = useCreateProcesso();
  const deleteMutation = useDeleteProcesso();
  const { toast } = useToast();

  // FASE 1.4: Reset correto do formulário quando modal fechar
  useEffect(() => {
    if (!isCreateOpen) {
      setFormData(INITIAL_FORM_DATA);
      setCurrentTab('basico');
      setParteEditIndex(null);
    }
  }, [isCreateOpen]);

  // FASE 1.3: Validação em tempo real
  useEffect(() => {
    validateTabs();
  }, [formData]);

  const validateTabs = () => {
    const validation: Record<string, boolean> = {
      basico: !!(formData.numero && validarProcessoCNJ(formData.numero) && formData.clienteId && formData.tipoAcao && formData.areaDireito),
      localizacao: !!(formData.justica && formData.instancia && formData.uf),
      partes: true, // Validação de partes será feita separadamente
      informacoes: !!formData.objetoAcao,
      controle: true, // Todos os campos de controle são opcionais
    };
    setTabValidation(validation);
  };

  // FASE 2.2: Validação de partes
  const validatePartes = () => {
    if (!formData.partes || formData.partes.length === 0) return false;
    const hasAutor = formData.partes.some(p => p.tipoParte === 'AUTOR');
    const hasReu = formData.partes.some(p => p.tipoParte === 'REU');
    return hasAutor && hasReu;
  };

  // FASE 2.3: Contador de abas completas
  const getTabsCompleted = () => {
    const partesValid = validatePartes();
    const completed = Object.values(tabValidation).filter(Boolean).length + (partesValid ? 1 : 0);
    return completed;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do número do processo
    if (!validarProcessoCNJ(formData.numero)) {
      toast({
        title: 'Número inválido',
        description: 'O número do processo deve conter exatamente 20 dígitos no formato CNJ',
        variant: 'error'
      });
      setCurrentTab('basico');
      return;
    }

    // Validações dos campos obrigatórios
    const camposObrigatorios = [
      { campo: 'numero', nome: 'Número do Processo', tab: 'basico' },
      { campo: 'clienteId', nome: 'Cliente', tab: 'basico' },
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

      await createMutation.mutateAsync(payload);
      toast({ title: 'Sucesso', description: 'Processo criado com sucesso', variant: 'success' });
      setIsCreateOpen(false);
      setFormData(INITIAL_FORM_DATA);
      setCurrentTab('basico');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao criar processo', variant: 'error' });
    }
  };

  const handleAddParte = (parte: ParteProcessualData) => {
    console.log('✅ Adicionando/editando parte:', parte);
    if (parteEditIndex !== null) {
      // Editar parte existente
      const novasPartes = [...formData.partes];
      novasPartes[parteEditIndex] = parte;
      setFormData({ ...formData, partes: novasPartes });
      setParteEditIndex(null);
    } else {
      // Adicionar nova parte
      setFormData({ ...formData, partes: [...formData.partes, parte] });
    }
    setIsParteModalOpen(false);
  };

  const handleEditParte = (parte: ParteProcessualData, index: number) => {
    setParteEditIndex(index);
    setIsParteModalOpen(true);
  };

  const handleRemoveParte = (index: number) => {
    const novasPartes = formData.partes.filter((_, i) => i !== index);
    setFormData({ ...formData, partes: novasPartes });
  };

  const handleDeleteProcesso = async (id: string, numero: string) => {
    if (!window.confirm(`Tem certeza que deseja deletar o processo ${numero}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Sucesso', description: 'Processo deletado com sucesso', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao deletar processo', variant: 'error' });
    }
  };

  // FASE 3.1: Debounce para formatação de moeda
  const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const formatCurrency = useCallback(
    debounce((value: string) => {
      const num = value.replace(/\D/g, '');
      if (!num) return '';
      const formatted = (parseInt(num) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `R$ ${formatted}`;
    }, 300),
    []
  );

  const handleCurrencyChange = (field: 'valorCausa' | 'valorHonorarios', value: string) => {
    const formatted = formatCurrency(value);
    setFormData({ ...formData, [field]: formatted });
  };

  const statusColors: Record<string, any> = {
    EM_ANDAMENTO: 'info',
    SUSPENSO: 'warning',
    CONCLUIDO: 'success',
    ARQUIVADO: 'default',
  };

  // FASE 2.3: Componente indicador de aba
  const TabIndicator = ({ isValid }: { isValid: boolean }) => (
    isValid ? (
      <Check className="h-4 w-4 text-green-600 ml-2 pointer-events-none" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500 ml-2 pointer-events-none" />
    )
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Processos</h1>
          <p className="text-sm lg:text-base text-gray-500">Gerencie todos os processos</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Processo
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <Button
              variant={!statusFilter ? 'default' : 'outline'}
              onClick={() => setStatusFilter('')}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'EM_ANDAMENTO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('EM_ANDAMENTO')}
              className="whitespace-nowrap"
            >
              Em Andamento
            </Button>
            <Button
              variant={statusFilter === 'SUSPENSO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('SUSPENSO')}
              className="whitespace-nowrap"
            >
              Suspensos
            </Button>
            <Button
              variant={statusFilter === 'CONCLUIDO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('CONCLUIDO')}
              className="whitespace-nowrap"
            >
              Concluídos
            </Button>
            <Button
              variant={statusFilter === 'ARQUIVADO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('ARQUIVADO')}
              className="whitespace-nowrap"
            >
              Arquivados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Processos */}
      {isLoading ? (
        <LoadingSpinner />
      ) : data?.processos?.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.processos.map((processo: any) => (
            <Card key={processo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 flex-shrink-0" />
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Badge variant={statusColors[processo.status]} className="text-xs">
                      {processo.status.replace('_', ' ')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteProcesso(processo.id, processo.numero);
                      }}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Deletar processo"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-3 text-base sm:text-lg break-all">{processo.numero}</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="truncate">
                    <span className="font-semibold">Cliente:</span>{' '}
                    <span className="text-gray-700">{processo.cliente.user.nome}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Início:</span>{' '}
                    <span className="text-gray-700">{formatDate(processo.dataInicio)}</span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 mt-2 text-xs sm:text-sm">{processo.objetoAcao || processo.descricao}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-gray-500 mt-3">
                    <span className="whitespace-nowrap">📄 {processo._count?.documentos || 0} docs</span>
                    <span className="whitespace-nowrap">💬 {processo._count?.mensagens || 0} msgs</span>
                    <span className="whitespace-nowrap">👥 {processo._count?.partes || 0} partes</span>
                  </div>
                </div>
                <Link href={`/advogado/processos/${processo.id}`} className="block mt-3 sm:mt-4">
                  <Button variant="outline" className="w-full text-sm">
                    Ver Detalhes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nenhum processo encontrado
          </CardContent>
        </Card>
      )}

      {/* Modal Criar Processo */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Processo</DialogTitle>
            {/* FASE 2.3: Badge de progresso */}
            <p className="text-sm text-gray-500 mt-2">
              Progresso: {getTabsCompleted()}/5 abas completas
            </p>
          </DialogHeader>

          <form onSubmit={handleCreate}>
            <Tabs value={currentTab} onValueChange={(newTab) => {
              console.log('🔄 Navegando para aba:', newTab);
              setCurrentTab(newTab);
            }}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basico" className="flex items-center" aria-label="Aba de dados básicos">
                  Básico
                  <TabIndicator isValid={tabValidation.basico} />
                </TabsTrigger>
                <TabsTrigger value="localizacao" className="flex items-center" aria-label="Aba de localização judicial">
                  Localização
                  <TabIndicator isValid={tabValidation.localizacao} />
                </TabsTrigger>
                <TabsTrigger value="partes" className="flex items-center" aria-label="Aba de partes processuais">
                  Partes
                  <TabIndicator isValid={validatePartes()} />
                </TabsTrigger>
                <TabsTrigger value="informacoes" className="flex items-center" aria-label="Aba de informações processuais">
                  Informações
                  <TabIndicator isValid={tabValidation.informacoes} />
                </TabsTrigger>
                <TabsTrigger value="controle" className="flex items-center" aria-label="Aba de controle e prazos">
                  Controle
                  <TabIndicator isValid={tabValidation.controle} />
                </TabsTrigger>
              </TabsList>

              {/* Aba 1: Dados Básicos */}
              <TabsContent value="basico" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="numero">Número do Processo *</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => {
                      const masked = maskProcessoCNJ(e.target.value);
                      setFormData({ ...formData, numero: masked });
                    }}
                    placeholder="0000000-00.0000.0.00.0000"
                    maxLength={25}
                    required
                    aria-required="true"
                  />
                  {formData.numero && !validarProcessoCNJ(formData.numero) && (
                    <p className="text-xs text-red-600 mt-1">
                      Número deve conter exatamente 20 dígitos no formato CNJ
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select
                    id="cliente"
                    value={formData.clienteId}
                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                    required
                    aria-required="true"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientesData?.clientes?.map((cliente: any) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.user.nome}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipoAcao">Tipo de Ação *</Label>
                  <Select
                    id="tipoAcao"
                    value={formData.tipoAcao}
                    onChange={(e) => setFormData({ ...formData, tipoAcao: e.target.value })}
                    required
                    aria-required="true"
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
                    aria-required="true"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="justica">Justiça *</Label>
                    <Select
                      id="justica"
                      value={formData.justica}
                      onChange={(e) => setFormData({ ...formData, justica: e.target.value })}
                      required
                      aria-required="true"
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
                      aria-required="true"
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
                      aria-required="true"
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
                <div className="flex items-center justify-between mb-4">
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
                  partes={formData.partes}
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
                    aria-required="true"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valorCausa">Valor da Causa</Label>
                    <Input
                      id="valorCausa"
                      value={formData.valorCausa}
                      onChange={(e) => handleCurrencyChange('valorCausa', e.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="valorHonorarios">Valor dos Honorários</Label>
                    <Input
                      id="valorHonorarios"
                      value={formData.valorHonorarios}
                      onChange={(e) => handleCurrencyChange('valorHonorarios', e.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 5: Controle e Prazos */}
              <TabsContent value="controle" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Processo'}
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
        parteEdit={parteEditIndex !== null ? formData.partes[parteEditIndex] : undefined}
        clientes={clientesData?.clientes || []}
        partesExistentes={partesData?.partes || []}
      />
    </div>
  );
}
