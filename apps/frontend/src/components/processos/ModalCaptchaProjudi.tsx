'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface ModalCaptchaProjudiProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsultar: (captchaResposta: string) => Promise<void>;
  captchaData: {
    sessionId: string;
    captchaImage: string;
    numeroProcesso: string;
  } | null;
  loading?: boolean;
  error?: string | null;
}

export function ModalCaptchaProjudi({
  open,
  onOpenChange,
  onConsultar,
  captchaData,
  loading = false,
  error = null
}: ModalCaptchaProjudiProps) {
  const [captchaResposta, setCaptchaResposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Reset ao abrir/fechar modal
  useEffect(() => {
    if (!open) {
      setCaptchaResposta('');
      setEnviando(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaResposta || captchaResposta.length < 4) {
      return;
    }

    setEnviando(true);

    try {
      await onConsultar(captchaResposta);
      // Modal será fechado pelo componente pai após sucesso
    } catch (error) {
      // Erro será tratado pelo componente pai
      console.error('Erro ao consultar:', error);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && captchaResposta.length >= 4 && !enviando) {
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary-600" />
            Consulta PROJUDI - Paraná
          </DialogTitle>
        </DialogHeader>

        {captchaData && (
          <div className="space-y-4">
            {/* Info do processo */}
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
            <form onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="captchaResposta">
                  Digite o código acima:
                </Label>
                <Input
                  id="captchaResposta"
                  value={captchaResposta}
                  onChange={(e) => setCaptchaResposta(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
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

              {/* Mensagem de erro */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Erro</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Botões */}
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
                  disabled={captchaResposta.length < 4 || enviando || loading}
                  className="flex-1"
                >
                  {enviando ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    'Consultar'
                  )}
                </Button>
              </div>
            </form>

            {/* Aviso legal */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-gray-600">
                <strong>Informação:</strong> Esta consulta acessa apenas dados
                públicos do processo disponíveis na consulta pública do PROJUDI/TJPR.
                Nenhum dado sensível ou sigiloso será acessado.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
