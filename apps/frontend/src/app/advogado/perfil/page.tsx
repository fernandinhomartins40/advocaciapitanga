'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    nome: '',
    email: '',
    oab: '',
    telefone: '',
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
      const response = await api.get('/advogado/perfil');
      setProfile({
        nome: response.data.user.nome,
        email: response.data.user.email,
        oab: response.data.oab,
        telefone: response.data.telefone || '',
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
      await api.put('/advogado/perfil', profile);
      toast({ title: 'Sucesso', description: 'Perfil atualizado', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao atualizar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.novaSenha !== password.confirmarSenha) {
      toast({ title: 'Erro', description: 'As senhas não conferem', variant: 'error' });
      return;
    }
    try {
      await api.put('/advogado/perfil/senha', {
        senhaAtual: password.senhaAtual,
        novaSenha: password.novaSenha,
      });
      toast({ title: 'Sucesso', description: 'Senha alterada', variant: 'success' });
      setPassword({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao alterar senha', variant: 'error' });
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
              <Label htmlFor="oab">OAB</Label>
              <Input
                id="oab"
                value={profile.oab}
                onChange={(e) => setProfile({ ...profile, oab: e.target.value })}
              />
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
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <Label htmlFor="senhaAtual">Senha Atual</Label>
              <Input
                id="senhaAtual"
                type="password"
                value={password.senhaAtual}
                onChange={(e) => setPassword({ ...password, senhaAtual: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <Input
                id="novaSenha"
                type="password"
                value={password.novaSenha}
                onChange={(e) => setPassword({ ...password, novaSenha: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                value={password.confirmarSenha}
                onChange={(e) => setPassword({ ...password, confirmarSenha: e.target.value })}
              />
            </div>
            <Button type="submit">Alterar Senha</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
