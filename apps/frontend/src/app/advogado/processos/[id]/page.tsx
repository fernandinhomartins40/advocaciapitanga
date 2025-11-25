'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Upload, Download, Trash2, Send } from 'lucide-react';
import { useProcesso, useUpdateProcesso } from '@/hooks/useProcessos';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate, formatCPF } from '@/lib/utils';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function ProcessoDetalhesPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: processo, isLoading } = useProcesso(id);
  const updateMutation = useUpdateProcesso();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    descricao: '',
    status: '',
  });

  const [mensagem, setMensagem] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          descricao: formData.descricao || processo.descricao,
          status: formData.status || processo.status,
        },
      });
      toast({ title: 'Sucesso', description: 'Processo atualizado', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao atualizar processo', variant: 'error' });
    }
  };

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
      window.location.reload();
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
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Número do Processo</Label>
                  <Input value={processo.numero} disabled />
                </div>
                <div>
                  <Label>Data de Início</Label>
                  <Input value={formatDate(processo.dataInicio)} disabled />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={processo.cliente.user.nome} disabled />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={formatCPF(processo.cliente.cpf)} disabled />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  defaultValue={processo.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="SUSPENSO">Suspenso</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  defaultValue={processo.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={6}
                />
              </div>

              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                      <div className="flex items-center justify-between mb-2">
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
    </div>
  );
}
