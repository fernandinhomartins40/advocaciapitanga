'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { formatCPF } from '@/lib/utils';

export default function ClientePerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    endereco: '',
  });
  const [password, setPassword] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/clientes/perfil/me');
      setProfile({
        nome: response.data.user.nome,
        email: response.data.user.email,
        cpf: response.data.cpf,
        telefone: response.data.telefone || '',
        endereco: response.data.endereco || '',
      });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar perfil', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/clientes/perfil/me', {
        nome: profile.nome,
        telefone: profile.telefone,
        endereco: profile.endereco,
      });
      toast({ title: 'Sucesso', description: 'Perfil atualizado', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao atualizar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={profile.nome}
                onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Email (não editável)</Label>
              <Input value={profile.email} disabled />
            </div>
            <div>
              <Label>CPF (não editável)</Label>
              <Input value={formatCPF(profile.cpf)} disabled />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={profile.telefone}
                onChange={(e) => setProfile({ ...profile, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={profile.endereco}
                onChange={(e) => setProfile({ ...profile, endereco: e.target.value })}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
