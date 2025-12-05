'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Mail, Phone, Shield, ShieldCheck, ShieldOff, UserX, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConviteMembroDialog } from '@/components/equipe/ConviteMembroDialog';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { MembroEscritorio } from '@/types';
import api from '@/lib/api';

export default function EquipePage() {
  const { toast } = useToast();
  const { hasPermission, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [membros, setMembros] = useState<MembroEscritorio[]>([]);
  const [busca, setBusca] = useState('');
  const [showConviteDialog, setShowConviteDialog] = useState(false);

  useEffect(() => {
    carregarMembros();
  }, []);

  const carregarMembros = async () => {
    try {
      const response = await api.get('/escritorio/membros');
      setMembros(response.data);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar membros', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDesativar = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este membro?')) return;

    try {
      await api.patch(`/escritorio/membros/${id}/desativar`);
      toast({ title: 'Sucesso', description: 'Membro desativado', variant: 'success' });
      carregarMembros();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao desativar', variant: 'error' });
    }
  };

  const handleReativar = async (id: string) => {
    try {
      await api.patch(`/escritorio/membros/${id}/reativar`);
      toast({ title: 'Sucesso', description: 'Membro reativado', variant: 'success' });
      carregarMembros();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao reativar', variant: 'error' });
    }
  };

  const handleRemover = async (id: string) => {
    if (!confirm('ATENÇÃO: Esta ação é IRREVERSÍVEL! Deseja realmente remover este membro permanentemente?')) return;

    try {
      await api.delete(`/escritorio/membros/${id}`);
      toast({ title: 'Sucesso', description: 'Membro removido permanentemente', variant: 'success' });
      carregarMembros();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao remover', variant: 'error' });
    }
  };

  const membrosFiltrados = membros.filter((membro) =>
    membro.user?.nome.toLowerCase().includes(busca.toLowerCase()) ||
    membro.user?.email.toLowerCase().includes(busca.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN_ESCRITORIO: { label: 'Admin', color: 'bg-red-100 text-red-800' },
      ADVOGADO: { label: 'Advogado', color: 'bg-blue-100 text-blue-800' },
      ASSISTENTE: { label: 'Assistente', color: 'bg-green-100 text-green-800' },
      ESTAGIARIO: { label: 'Estagiário', color: 'bg-yellow-100 text-yellow-800' },
    };
    const badge = badges[role as keyof typeof badges] || { label: role, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  const podeGerenciar = hasPermission('gerenciarUsuarios') || isAdmin;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão da Equipe</h1>
          <p className="text-gray-500">Gerencie os membros do seu escritório</p>
        </div>
        {podeGerenciar && (
          <Button onClick={() => setShowConviteDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Membro
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={carregarMembros}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membrosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {busca ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado'}
            </div>
          ) : (
            <div className="space-y-4">
              {membrosFiltrados.map((membro) => (
                <div
                  key={membro.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !membro.ativo ? 'bg-gray-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{membro.user?.nome}</h3>
                      {getRoleBadge(membro.user?.role || '')}
                      {!membro.ativo && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {membro.user?.email}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {membro.gerenciarUsuarios && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Gerenciar Usuários</span>
                      )}
                      {membro.gerenciarTodosProcessos && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Todos Processos</span>
                      )}
                      {membro.gerenciarProcessosProprios && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Processos Próprios</span>
                      )}
                      {membro.gerenciarIA && (
                        <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded">IA Jurídica</span>
                      )}
                    </div>
                  </div>

                  {podeGerenciar && (
                    <div className="flex items-center gap-2">
                      {membro.ativo ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDesativar(membro.id)}
                          title="Desativar membro"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReativar(membro.id)}
                          title="Reativar membro"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemover(membro.id)}
                          title="Remover permanentemente"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConviteMembroDialog
        open={showConviteDialog}
        onOpenChange={setShowConviteDialog}
        onSuccess={carregarMembros}
      />
    </div>
  );
}
