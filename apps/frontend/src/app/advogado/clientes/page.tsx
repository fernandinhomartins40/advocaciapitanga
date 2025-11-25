'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '@/hooks/useClientes';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCPF, formatPhone } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    endereco: '',
  });

  const { data, isLoading } = useClientes({ search });
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const deleteMutation = useDeleteCliente();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      toast({ title: 'Sucesso', description: 'Cliente criado com sucesso', variant: 'success' });
      setIsCreateOpen(false);
      setFormData({ nome: '', email: '', cpf: '', telefone: '', endereco: '' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao criar cliente', variant: 'error' });
    }
  };

  const handleEdit = (cliente: any) => {
    setSelectedCliente(cliente);
    setFormData({
      nome: cliente.user.nome,
      email: cliente.user.email,
      cpf: cliente.cpf,
      telefone: cliente.telefone || '',
      endereco: cliente.endereco || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: selectedCliente.id,
        data: {
          nome: formData.nome,
          telefone: formData.telefone,
          endereco: formData.endereco,
        },
      });
      toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso', variant: 'success' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao atualizar cliente', variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: 'Sucesso', description: 'Cliente excluído com sucesso', variant: 'success' });
      } catch (error: any) {
        toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao excluir cliente', variant: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes ({data?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : data?.clientes?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clientes.map((cliente: any) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.user.nome}</TableCell>
                    <TableCell>{formatCPF(cliente.cpf)}</TableCell>
                    <TableCell>{cliente.user.email}</TableCell>
                    <TableCell>{cliente.telefone ? formatPhone(cliente.telefone) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(cliente.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">Nenhum cliente encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome Completo *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email (não editável)</Label>
              <Input value={formData.email} disabled />
            </div>
            <div>
              <Label>CPF (não editável)</Label>
              <Input value={formatCPF(formData.cpf)} disabled />
            </div>
            <div>
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Textarea
                id="edit-endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
