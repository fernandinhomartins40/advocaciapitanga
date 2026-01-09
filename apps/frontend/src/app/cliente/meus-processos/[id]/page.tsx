'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, Send } from 'lucide-react';
import { useProcesso } from '@/hooks/useProcessos';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate, formatCPF } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function ProcessoClienteDetalhesPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: processo, isLoading } = useProcesso(id);
  const [mensagem, setMensagem] = useState('');
  const { toast } = useToast();

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

  const handleSendMessage = async () => {
    if (!mensagem.trim()) return;

    try {
      await api.post('/mensagens', {
        processoId: id,
        conteudo: mensagem,
      });
      setMensagem('');
      toast({ title: 'Sucesso', description: 'Mensagem enviada', variant: 'success' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao enviar mensagem', variant: 'error' });
    }
  };

  const statusColors: Record<string, any> = {
    EM_ANDAMENTO: 'info',
    SUSPENSO: 'warning',
    CONCLUIDO: 'success',
    ARQUIVADO: 'default',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link href="/cliente/meus-processos" className="w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{processo.numero}</h1>
          <p className="text-gray-500">{processo.advogado.user.nome}</p>
        </div>
        <Badge variant={statusColors[processo.status]} className="w-fit">
          {processo.status.replace('_', ' ')}
        </Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos ({processo.documentos?.length || 0})
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
                  <label className="text-sm font-semibold">Número do Processo</label>
                  <Input value={processo.numero} disabled />
                </div>
                <div>
                  <label className="text-sm font-semibold">Data de Início</label>
                  <Input value={formatDate(processo.dataInicio)} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Advogado Responsável</label>
                  <Input value={processo.advogado.user.nome} disabled />
                </div>
                <div>
                  <label className="text-sm font-semibold">Status</label>
                  <Input value={processo.status.replace('_', ' ')} disabled />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">Descrição</label>
                <Textarea value={processo.descricao} disabled rows={6} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
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
                        className="w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum documento disponível</p>
              )}
            </CardContent>
          </Card>
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
                        msg.remetente === 'Cliente'
                          ? 'bg-primary-50 ml-0 sm:ml-12'
                          : 'bg-gray-100 mr-0 sm:mr-12'
                      }`}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
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

              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSendMessage} className="w-full sm:w-auto">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
