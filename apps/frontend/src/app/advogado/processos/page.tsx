'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText } from 'lucide-react';
import { useProcessos, useCreateProcesso } from '@/hooks/useProcessos';
import { useClientes } from '@/hooks/useClientes';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

export default function ProcessosPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    numero: '',
    clienteId: '',
    descricao: '',
    status: 'EM_ANDAMENTO',
  });

  const { data, isLoading } = useProcessos({ status: statusFilter as any });
  const { data: clientesData } = useClientes({ limit: 100 });
  const createMutation = useCreateProcesso();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      toast({ title: 'Sucesso', description: 'Processo criado com sucesso', variant: 'success' });
      setIsCreateOpen(false);
      setFormData({ numero: '', clienteId: '', descricao: '', status: 'EM_ANDAMENTO' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao criar processo', variant: 'error' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Processos</h1>
          <p className="text-gray-500">Gerencie todos os processos</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Processo
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button
              variant={!statusFilter ? 'default' : 'outline'}
              onClick={() => setStatusFilter('')}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'EM_ANDAMENTO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('EM_ANDAMENTO')}
            >
              Em Andamento
            </Button>
            <Button
              variant={statusFilter === 'SUSPENSO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('SUSPENSO')}
            >
              Suspensos
            </Button>
            <Button
              variant={statusFilter === 'CONCLUIDO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('CONCLUIDO')}
            >
              Concluídos
            </Button>
            <Button
              variant={statusFilter === 'ARQUIVADO' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('ARQUIVADO')}
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.processos.map((processo: any) => (
            <Card key={processo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary-600" />
                  <Badge variant={statusColors[processo.status]}>
                    {processo.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-lg">{processo.numero}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Cliente:</span>{' '}
                    {processo.cliente.user.nome}
                  </div>
                  <div>
                    <span className="font-semibold">Início:</span>{' '}
                    {formatDate(processo.dataInicio)}
                  </div>
                  <p className="text-gray-600 line-clamp-2 mt-2">{processo.descricao}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-3">
                    <span>📄 {processo._count?.documentos || 0} docs</span>
                    <span>💬 {processo._count?.mensagens || 0} msgs</span>
                  </div>
                </div>
                <Link href={`/advogado/processos/${processo.id}`} className="block mt-4">
                  <Button variant="outline" className="w-full">
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

      {/* Modal Criar */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Processo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="numero">Número do Processo *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="0000000-00.0000.0.00.0000"
                required
              />
            </div>
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Select
                id="cliente"
                value={formData.clienteId}
                onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                required
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
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={4}
                required
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
            <div className="flex justify-end gap-2">
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
    </div>
  );
}
