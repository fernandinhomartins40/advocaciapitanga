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
  onCadastrar: (captchaResposta: string) => Promise<void>;
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
  onCadastrar,
  captchaData,
  loading = false,
  error = null,
  sucesso = false
}: ModalAutoCadastroProcessoProps) {
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [captchaResposta, setCaptchaResposta] = useState('');
  const [etapa, setEtapa] = useState<'numero' | 'captcha' | 'sucesso'>('numero');
  const [enviando, setEnviando] = useState(false);

  // Reset ao abrir/fechar modal
  useEffect(() => {
    if (!open) {
      setNumeroProcesso('');
      setCaptchaResposta('');
      setEtapa('numero');
      setEnviando(false);
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
    if (sucesso && etapa === 'captcha') {
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

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaResposta || captchaResposta.length < 4) {
      return;
    }

    setEnviando(true);
    try {
      await onCadastrar(captchaResposta);
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
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
      handleCadastrar(e as any);
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
            <form onSubmit={handleCadastrar}>
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
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Etapa 3: Sucesso */}
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
