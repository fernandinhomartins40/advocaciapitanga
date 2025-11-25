'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';

export default function ClienteMensagensPage() {
  const [selectedProcesso, setSelectedProcesso] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');
  const { toast } = useToast();

  const { data: processos, isLoading: loadingProcessos } = useQuery({
    queryKey: ['cliente-processos-mensagens'],
    queryFn: async () => {
      const response = await api.get('/processos');
      return response.data.processos;
    },
  });

  const { data: mensagens, isLoading: loadingMensagens, refetch } = useQuery({
    queryKey: ['mensagens', selectedProcesso],
    queryFn: async () => {
      if (!selectedProcesso) return [];
      const response = await api.get(`/mensagens/processo/${selectedProcesso}`);
      return response.data;
    },
    enabled: !!selectedProcesso,
  });

  const handleSendMessage = async () => {
    if (!mensagem.trim() || !selectedProcesso) return;

    try {
      await api.post('/mensagens', {
        processoId: selectedProcesso,
        conteudo: mensagem,
      });
      setMensagem('');
      toast({ title: 'Sucesso', description: 'Mensagem enviada', variant: 'success' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao enviar mensagem', variant: 'error' });
    }
  };

  if (loadingProcessos) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mensagens</h1>
        <p className="text-gray-500">Converse com seu advogado</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar - Lista de Processos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processos?.map((processo: any) => (
                <button
                  key={processo.id}
                  onClick={() => setSelectedProcesso(processo.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedProcesso === processo.id
                      ? 'bg-primary-50 border-primary-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="font-semibold text-sm truncate">{processo.numero}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {processo._count?.mensagens || 0} mensagens
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedProcesso
                ? processos?.find((p: any) => p.id === selectedProcesso)?.numero
                : 'Selecione uma conversa'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {selectedProcesso ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {loadingMensagens ? (
                    <LoadingSpinner />
                  ) : mensagens?.length > 0 ? (
                    mensagens.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          msg.remetente === 'Cliente'
                            ? 'bg-primary-50 ml-12'
                            : 'bg-gray-100 mr-12'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">{msg.remetente}</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.conteudo}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma mensagem ainda. Inicie a conversa!
                    </p>
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Selecione um processo para ver as mensagens
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
