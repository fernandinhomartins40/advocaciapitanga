'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useClientes } from '@/hooks/useClientes';

interface ModalAutoCadastroProcessoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIniciarCaptcha: (numeroProcesso: string) => Promise<void>;
  onConsultar: (captchaResposta: string) => Promise<any>; // Retorna dados extraídos
  onCadastrar: (dadosExtraidos: any) => Promise<void>; // Cadastra com dados
  captchaData: {
    sessionId: string;
    captchaImage: string;
    numeroProcesso: string;
  } | null;
  loading?: boolean;
  error?: string | null;
  sucesso?: boolean;
}

export function ModalAutoCadastroProcesso({
  open,
  onOpenChange,
  onIniciarCaptcha,
  onConsultar,
  onCadastrar,
  captchaData,
  loading = false,
  error = null,
  sucesso = false
}: ModalAutoCadastroProcessoProps) {
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [captchaResposta, setCaptchaResposta] = useState('');
  const [etapa, setEtapa] = useState<'numero' | 'captcha' | 'extracao' | 'selecao-parte' | 'cliente' | 'processo' | 'sucesso'>('numero');
  const [enviando, setEnviando] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<any>(null);
  const [parteSelecionada, setParteSelecionada] = useState<any>(null);
  const [clienteData, setClienteData] = useState<any>(null);
  const [clienteCriado, setClienteCriado] = useState<any>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<Record<number, any[]>>({});

  // Reset ao abrir/fechar modal
  useEffect(() => {
    if (!open) {
      setNumeroProcesso('');
      setCaptchaResposta('');
      setEtapa('numero');
      setEnviando(false);
      setDadosExtraidos(null);
    }
  }, [open]);

  // Atualizar etapa quando recebe CAPTCHA
  useEffect(() => {
    if (captchaData && etapa === 'numero') {
      setEtapa('captcha');
    }
  }, [captchaData, etapa]);

  // Atualizar etapa quando tem sucesso
  useEffect(() => {
    if (sucesso && etapa === 'processo') {
      setEtapa('sucesso');
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    }
  }, [sucesso, etapa, onOpenChange]);

  const handleIniciarCaptcha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroProcesso || numeroProcesso.length < 10) {
      return;
    }

    setEnviando(true);
    try {
      await onIniciarCaptcha(numeroProcesso);
    } catch (error) {
      console.error('Erro ao iniciar CAPTCHA:', error);
    } finally {
      setEnviando(false);
    }
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaResposta || captchaResposta.length < 4) {
      return;
    }

    setEnviando(true);
    try {
      const resposta = await onConsultar(captchaResposta);
      console.log('[AUTO-CADASTRO] ===================================');
      console.log('[AUTO-CADASTRO] Resposta COMPLETA:', JSON.stringify(resposta, null, 2));
      console.log('[AUTO-CADASTRO] Tipo:', typeof resposta);
      console.log('[AUTO-CADASTRO] Keys:', resposta ? Object.keys(resposta) : 'null');

      // A resposta pode estar em resposta.dados ou diretamente em resposta
      const dados = resposta?.dados || resposta;
      console.log('[AUTO-CADASTRO] Dados extraídos:', dados);
      console.log('[AUTO-CADASTRO] dados.partes:', dados?.partes);
      console.log('[AUTO-CADASTRO] ===================================');

      setDadosExtraidos(dados);
      setEtapa('extracao');

      // Buscar clientes existentes para cada parte
      if (dados?.partes && dados.partes.length > 0) {
        buscarClientesExistentes(dados.partes);
      }

      // Após 2 segundos, mostrar seleção de parte
      setTimeout(() => {
        console.log('[AUTO-CADASTRO] Mostrando seleção de partes...');
        setEtapa('selecao-parte');
      }, 2000);
    } catch (error) {
      console.error('Erro ao consultar:', error);
    } finally {
      setEnviando(false);
    }
  };

  // Busca clientes existentes com nome igual ou parecido
  const buscarClientesExistentes = async (partes: any[]) => {
    console.log('[AUTO-CADASTRO] Buscando clientes existentes para', partes.length, 'partes...');

    const resultados: Record<number, any[]> = {};

    for (let i = 0; i < partes.length; i++) {
      const parte = partes[i];
      if (!parte.nome || parte.nome.length < 3) continue;

      try {
        // Buscar por nome exato ou similar
        const response = await fetch(`/api/clientes?search=${encodeURIComponent(parte.nome)}&limit=3`);
        const data = await response.json();

        console.log(`[AUTO-CADASTRO] Clientes encontrados para "${parte.nome}":`, data.clientes?.length || 0);

        if (data.clientes && data.clientes.length > 0) {
          resultados[i] = data.clientes;
        }
      } catch (error) {
        console.error(`[AUTO-CADASTRO] Erro ao buscar clientes para "${parte.nome}":`, error);
      }
    }

    setClientesEncontrados(resultados);
    console.log('[AUTO-CADASTRO] Total de partes com clientes encontrados:', Object.keys(resultados).length);
  };

  // Prepara dados do cliente a partir da parte selecionada pelo usuário
  const prepararDadosCliente = (parte: any) => {
    console.log('[AUTO-CADASTRO FRONTEND] ===== PREPARAR DADOS CLIENTE =====');
    console.log('[AUTO-CADASTRO FRONTEND] Parte selecionada:', parte);

    if (!parte) {
      console.warn('[AUTO-CADASTRO FRONTEND] ⚠️ Nenhuma parte selecionada!');
      setClienteData({
        tipoPessoa: 'FISICA' as const,
        nome: '',
        cpf: '',
        email: '',
        nacionalidade: 'Brasileiro(a)',
      });
      return;
    }

    console.log('[AUTO-CADASTRO FRONTEND] ✓ Criando clienteData com parte selecionada:', {
      nome: parte.nome,
      tipo: parte.tipo,
      cpf: parte.cpf
    });

    setClienteData({
      tipoPessoa: 'FISICA' as const,
      nome: parte.nome || '',
      cpf: parte.cpf || '',
      email: '',
      nacionalidade: 'Brasileiro(a)',
    });

    console.log('[AUTO-CADASTRO FRONTEND] ==========================================');
  };

  // Handler para quando usuário seleciona uma parte
  const handleSelecionarParte = (parte: any) => {
    console.log('[AUTO-CADASTRO] Parte selecionada pelo usuário:', parte);
    setParteSelecionada(parte);
    prepararDadosCliente(parte);
    setEtapa('cliente');
  };

  // Handler para quando usuário seleciona um cliente existente
  const handleSelecionarClienteExistente = (cliente: any) => {
    console.log('[AUTO-CADASTRO] Cliente existente selecionado:', cliente);

    // Pular direto para o formulário de processo, usando o cliente existente
    setClienteCriado({
      id: cliente.id,
      nome: cliente.user?.nome || cliente.nome,
      cpf: cliente.cpf,
      email: cliente.user?.email || cliente.email
    });

    setEtapa('processo');
  };

  const handleSalvarCliente = async (cliente: any) => {
    // Salvar cliente e ir para etapa de processo
    setClienteCriado(cliente);
    setEtapa('processo');
  };

  const handleCadastrarProcesso = async (processoData: any) => {
    if (!clienteCriado || !dadosExtraidos) return;

    setEnviando(true);
    try {
      // Cadastrar processo com cliente vinculado
      await onCadastrar({
        ...dadosExtraidos,
        clienteId: clienteCriado.id,
        ...processoData
      });
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro ao cadastrar processo:', error);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPressNumero = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && numeroProcesso.length >= 10 && !enviando) {
      handleIniciarCaptcha(e as any);
    }
  };

  const handleKeyPressCaptcha = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && captchaResposta.length >= 4 && !enviando) {
      handleConsultar(e as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            Auto-Cadastrar Processo via PROJUDI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Etapa 1: Número do Processo */}
          {etapa === 'numero' && (
            <form onSubmit={handleIniciarCaptcha}>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Atenção:</strong> Digite o número do processo do PROJUDI/TJPR.
                    O sistema irá consultar automaticamente e criar:
                  </p>
                  <ul className="text-xs text-blue-600 mt-2 ml-4 list-disc">
                    <li>Cliente (primeira parte AUTOR)</li>
                    <li>Processo completo</li>
                    <li>Todas as partes processuais</li>
                    <li>Movimentações</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroProcesso">
                    Número do Processo *
                  </Label>
                  <Input
                    id="numeroProcesso"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    onKeyPress={handleKeyPressNumero}
                    placeholder="0000000-00.0000.0.00.0000"
                    maxLength={25}
                    autoFocus
                    disabled={enviando || loading}
                  />
                  <p className="text-xs text-gray-500">
                    Exemplo: 0002688-54.2024.8.16.0136
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800">Erro</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={enviando}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={numeroProcesso.length < 10 || enviando || loading}
                    className="flex-1"
                  >
                    {enviando || loading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Continuar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Etapa 2: CAPTCHA */}
          {etapa === 'captcha' && captchaData && (
            <form onSubmit={handleConsultar}>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Processo:</strong> {captchaData.numeroProcesso}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Tribunal de Justiça do Paraná - PROJUDI
                  </p>
                </div>

                {/* Imagem CAPTCHA */}
                <div className="space-y-2">
                  <Label>Código de Segurança (CAPTCHA)</Label>
                  <div className="flex justify-center bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
                    {loading ? (
                      <div className="py-8">
                        <LoadingSpinner size="md" />
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Carregando CAPTCHA...
                        </p>
                      </div>
                    ) : (
                      <img
                        src={captchaData.captchaImage}
                        alt="CAPTCHA PROJUDI"
                        className="max-w-full h-auto"
                        style={{ maxHeight: '120px' }}
                      />
                    )}
                  </div>
                </div>

                {/* Input para resposta */}
                <div className="space-y-2">
                  <Label htmlFor="captchaResposta">
                    Digite o código acima:
                  </Label>
                  <Input
                    id="captchaResposta"
                    value={captchaResposta}
                    onChange={(e) => setCaptchaResposta(e.target.value)}
                    onKeyPress={handleKeyPressCaptcha}
                    placeholder="Ex: ABC123"
                    maxLength={8}
                    autoFocus
                    disabled={enviando || loading}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                  <p className="text-xs text-gray-500">
                    Digite exatamente como aparece na imagem
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800">Erro</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEtapa('numero')}
                    disabled={enviando}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={captchaResposta.length < 4 || enviando || loading}
                    className="flex-1"
                  >
                    {enviando ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Consultando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Consultar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Etapa 3: Extração em Andamento */}
          {etapa === 'extracao' && (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center justify-center">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Extraindo dados do PROJUDI...
                </p>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Aguarde enquanto processamos as informações do processo
                </p>
              </div>
            </div>
          )}

          {/* DEBUG: Mostrar etapa atual */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
              <strong>DEBUG:</strong> Etapa atual: {etapa} | clienteData: {clienteData ? 'SIM' : 'NÃO'}
            </div>
          )}

          {/* Etapa 4: Seleção de Parte (NOVA ETAPA) */}
          {etapa === 'selecao-parte' && dadosExtraidos?.partes && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800 font-semibold">
                  👥 Selecione a Parte que Representa o Cliente
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Um processo pode ter múltiplas partes. Selecione qual delas é o seu cliente (pode ser autor, réu, embargante, embargado, etc.)
                </p>
              </div>

              {dadosExtraidos.partes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma parte foi extraída do processo.</p>
                  <p className="text-xs mt-2">Você poderá preencher os dados manualmente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dadosExtraidos.partes.map((parte: any, index: number) => (
                    <div key={index} className="space-y-2">
                      {/* Card da Parte */}
                      <button
                        type="button"
                        onClick={() => handleSelecionarParte(parte)}
                        className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{parte.nome}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {parte.tipo}
                              </span>
                              {parte.cpf && (
                                <span className="ml-2 text-gray-500">CPF: {parte.cpf}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Cadastrar como novo cliente
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>

                      {/* Clientes Existentes para esta Parte */}
                      {clientesEncontrados[index] && clientesEncontrados[index].length > 0 && (
                        <div className="ml-4 pl-4 border-l-2 border-green-200 space-y-2">
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                            ✓ Cliente(s) já cadastrado(s) com nome similar:
                          </p>
                          {clientesEncontrados[index].map((cliente: any, clienteIdx: number) => (
                            <button
                              key={clienteIdx}
                              type="button"
                              onClick={() => handleSelecionarClienteExistente(cliente)}
                              className="w-full text-left p-3 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all bg-green-50/50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">
                                    {cliente.user?.nome || cliente.nome}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {cliente.cpf && <span>CPF: {cliente.cpf}</span>}
                                    {cliente.user?.email && (
                                      <span className="ml-2">• {cliente.user.email}</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-green-600 mt-1 font-medium">
                                    Usar cliente existente (pular cadastro)
                                  </p>
                                </div>
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEtapa('captcha')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                {dadosExtraidos.partes.length === 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      prepararDadosCliente(null);
                      setEtapa('cliente');
                    }}
                    className="flex-1"
                  >
                    Cadastrar Manualmente
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Etapa 5: Formulário do Cliente (PRÉ-PREENCHIDO) */}
          {etapa === 'cliente' && (() => {
            console.log('[AUTO-CADASTRO FRONTEND] Renderizando formulário do cliente');
            console.log('[AUTO-CADASTRO FRONTEND] clienteData atual:', clienteData);
            return (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-semibold">
                  📋 Etapa 2 de 3: Cadastro do Cliente
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Preencha os dados obrigatórios do cliente (CPF e Email são essenciais)
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!clienteData) return;
                handleSalvarCliente(clienteData);
              }} className="space-y-3">
                <div>
                  <Label htmlFor="nomeCliente">Nome Completo *</Label>
                  <Input
                    id="nomeCliente"
                    value={clienteData?.nome || ''}
                    onChange={(e) => {
                      console.log('[AUTO-CADASTRO FRONTEND] Campo nome alterado:', e.target.value);
                      setClienteData({
                        ...(clienteData || { tipoPessoa: 'FISICA' as const, nacionalidade: 'Brasileiro(a)' }),
                        nome: e.target.value
                      });
                    }}
                    required
                  />
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-gray-500 mt-1">Valor: {clienteData?.nome || '(vazio)'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cpfCliente">CPF * (obrigatório para identificação)</Label>
                  <Input
                    id="cpfCliente"
                    value={clienteData?.cpf || ''}
                    onChange={(e) => setClienteData({
                      ...(clienteData || { tipoPessoa: 'FISICA' as const, nacionalidade: 'Brasileiro(a)' }),
                      cpf: e.target.value
                    })}
                    placeholder="000.000.000-00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    O CPF é essencial para identificar o cliente no sistema
                  </p>
                </div>

                <div>
                  <Label htmlFor="emailCliente">E-mail * (para acesso ao sistema)</Label>
                  <Input
                    id="emailCliente"
                    type="email"
                    value={clienteData?.email || ''}
                    onChange={(e) => setClienteData({
                      ...(clienteData || { tipoPessoa: 'FISICA' as const, nacionalidade: 'Brasileiro(a)' }),
                      email: e.target.value
                    })}
                    placeholder="cliente@email.com"
                    required
                  />
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEtapa('captcha')}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    Próximo: Cadastrar Processo
                  </Button>
                </div>
              </form>
            </div>
            );
          })()}

          {/* Etapa 6: Formulário do Processo (PRÉ-PREENCHIDO) */}
          {etapa === 'processo' && dadosExtraidos && clienteCriado && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-semibold">
                  ✓ Cliente "{clienteCriado.nome}" cadastrado com sucesso!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  📋 Etapa 3 de 3: Confirme os dados do processo
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Informações do Processo */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Dados do Processo</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Número:</span>
                      <span className="font-mono">{dadosExtraidos.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-semibold text-green-700">{clienteCriado.nome}</span>
                    </div>
                    {dadosExtraidos.comarca && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Comarca:</span>
                        <span>{dadosExtraidos.comarca}</span>
                      </div>
                    )}
                    {dadosExtraidos.partes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Partes:</span>
                        <span>{dadosExtraidos.partes.length}</span>
                      </div>
                    )}
                    {dadosExtraidos.movimentacoes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Movimentações:</span>
                        <span>{dadosExtraidos.movimentacoes.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEtapa('cliente')}
                  disabled={enviando}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => handleCadastrarProcesso({})}
                  disabled={enviando}
                  className="flex-1"
                >
                  {enviando ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalizar Cadastro
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Etapa 6: Sucesso */}
          {etapa === 'sucesso' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processo Cadastrado!
              </h3>
              <p className="text-sm text-gray-600">
                O processo foi cadastrado automaticamente com sucesso.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
