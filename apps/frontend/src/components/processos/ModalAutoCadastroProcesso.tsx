'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

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
  const [etapa, setEtapa] = useState<'numero' | 'captcha' | 'extracao' | 'cliente' | 'processo' | 'sucesso'>('numero');
  const [enviando, setEnviando] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<any>(null);
  const [clienteData, setClienteData] = useState<any>(null);
  const [clienteCriado, setClienteCriado] = useState<any>(null);

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
      const dados = await onConsultar(captchaResposta);
      setDadosExtraidos(dados);
      setEtapa('extracao');

      // Após 2 segundos, prepara formulário do cliente
      setTimeout(() => {
        prepararDadosCliente(dados);
        setEtapa('cliente');
      }, 2000);
    } catch (error) {
      console.error('Erro ao consultar:', error);
    } finally {
      setEnviando(false);
    }
  };

  // Prepara dados do cliente a partir da primeira parte AUTOR/EXEQUENTE
  const prepararDadosCliente = (dados: any) => {
    if (!dados.partes || dados.partes.length === 0) return;

    // Buscar primeira parte do polo ativo (AUTOR, EXEQUENTE, REQUERENTE)
    const primeiraParteAutor = dados.partes.find((p: any) => {
      const tipo = p.tipo.toUpperCase();
      return tipo.includes('AUTOR') ||
             tipo.includes('EXEQUENTE') ||
             tipo.includes('REQUERENTE');
    });

    if (primeiraParteAutor) {
      setClienteData({
        tipoPessoa: 'FISICA' as const,
        nome: primeiraParteAutor.nome || '',
        cpf: primeiraParteAutor.cpf || '',
        email: '', // Usuário precisa preencher
        nacionalidade: 'Brasileiro(a)',
      });
    }
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

          {/* Etapa 4: Formulário do Cliente (PRÉ-PREENCHIDO) */}
          {etapa === 'cliente' && clienteData && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-semibold">
                  📋 Etapa 1 de 2: Cadastro do Cliente
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Preencha os dados obrigatórios do cliente (CPF e Email são essenciais)
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleSalvarCliente(clienteData);
              }} className="space-y-3">
                <div>
                  <Label htmlFor="nomeCliente">Nome Completo *</Label>
                  <Input
                    id="nomeCliente"
                    value={clienteData.nome}
                    onChange={(e) => setClienteData({ ...clienteData, nome: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cpfCliente">CPF * (obrigatório para identificação)</Label>
                  <Input
                    id="cpfCliente"
                    value={clienteData.cpf}
                    onChange={(e) => setClienteData({ ...clienteData, cpf: e.target.value })}
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
                    value={clienteData.email}
                    onChange={(e) => setClienteData({ ...clienteData, email: e.target.value })}
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
          )}

          {/* Etapa 5: Formulário do Processo (PRÉ-PREENCHIDO) */}
          {etapa === 'processo' && dadosExtraidos && clienteCriado && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-semibold">
                  ✓ Cliente "{clienteCriado.nome}" cadastrado com sucesso!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  📋 Etapa 2 de 2: Confirme os dados do processo
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
