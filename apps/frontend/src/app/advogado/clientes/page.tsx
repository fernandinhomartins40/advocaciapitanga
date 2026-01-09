'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '@/hooks/useClientes';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCPF, formatCNPJ, formatPhone } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { ModalCliente, ClienteData } from '@/components/clientes/ModalCliente';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteData | undefined>(undefined);
  const [isEdit, setIsEdit] = useState(false);

  const { data, isLoading } = useClientes({ search });
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const deleteMutation = useDeleteCliente();
  const { toast } = useToast();

  const handleOpenCreate = () => {
    setSelectedCliente(undefined);
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: any) => {
    const clienteData: ClienteData = {
      id: cliente.id,
      tipoPessoa: cliente.tipoPessoa,
      nome: cliente.user.nome,
      email: cliente.user.email,
      cpf: cliente.cpf,
      rg: cliente.rg,
      orgaoEmissor: cliente.orgaoEmissor,
      nacionalidade: cliente.nacionalidade,
      estadoCivil: cliente.estadoCivil,
      profissao: cliente.profissao,
      dataNascimento: cliente.dataNascimento ? new Date(cliente.dataNascimento).toISOString().split('T')[0] : undefined,
      cnpj: cliente.cnpj,
      razaoSocial: cliente.razaoSocial,
      nomeFantasia: cliente.nomeFantasia,
      inscricaoEstadual: cliente.inscricaoEstadual,
      representanteLegal: cliente.representanteLegal,
      cargoRepresentante: cliente.cargoRepresentante,
      telefone: cliente.telefone,
      celular: cliente.celular,
      cep: cliente.cep,
      logradouro: cliente.logradouro,
      numero: cliente.numero,
      complemento: cliente.complemento,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
    };
    setSelectedCliente(clienteData);
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleSaveCliente = async (clienteData: ClienteData) => {
    try {
      if (isEdit && selectedCliente?.id) {
        await updateMutation.mutateAsync({
          id: selectedCliente.id,
          data: clienteData,
        });
        toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso', variant: 'success' });
      } else {
        await createMutation.mutateAsync(clienteData);
        toast({ title: 'Sucesso', description: 'Cliente criado com sucesso', variant: 'success' });
      }
      setIsModalOpen(false);
      setSelectedCliente(undefined);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao salvar cliente', variant: 'error' });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">Gerencie seus clientes</p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
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
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone/Celular</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clientes.map((cliente: any) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${cliente.tipoPessoa === 'FISICA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {cliente.tipoPessoa === 'FISICA' ? 'PF' : 'PJ'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{cliente.user.nome}</TableCell>
                    <TableCell>
                      {cliente.tipoPessoa === 'FISICA'
                        ? (cliente.cpf ? formatCPF(cliente.cpf) : '-')
                        : (cliente.cnpj ? formatCNPJ(cliente.cnpj) : '-')
                      }
                    </TableCell>
                    <TableCell>{cliente.user.email}</TableCell>
                    <TableCell>
                      {cliente.celular ? formatPhone(cliente.celular) : (cliente.telefone ? formatPhone(cliente.telefone) : '-')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(cliente)}
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
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Nenhum cliente encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Modal Cliente */}
      <ModalCliente
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveCliente}
        clienteEdit={selectedCliente}
        isEdit={isEdit}
      />
    </div>
  );
}
