'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Save, Check, X, Edit2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  // Estados para alteração de email
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Estados para confirmação de alteração de senha
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);

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

  // Validação de formato de OAB (OAB/UF + 5-7 dígitos)
  const formatOAB = (value: string) => {
    // Remove tudo que não é letra ou número
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Remove "OAB" se o usuário digitou
    let withoutOAB = cleaned;
    if (cleaned.startsWith('OAB')) {
      withoutOAB = cleaned.slice(3);
    }

    // Limita a 9 caracteres (2 letras UF + até 7 números)
    if (withoutOAB.length === 0) {
      return 'OAB/';
    }

    if (withoutOAB.length <= 2) {
      return `OAB/${withoutOAB}`;
    }

    const uf = withoutOAB.slice(0, 2);
    const numbers = withoutOAB.slice(2, 9);

    return `OAB/${uf}${numbers}`;
  };

  // Máscara de telefone
  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');

    // Aplica a máscara
    if (cleaned.length <= 10) {
      // (99) 9999-9999
      return cleaned.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').replace(/-$/, '');
    } else {
      // (99) 99999-9999
      return cleaned.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').replace(/-$/, '');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de OAB (OAB/UF + 5 a 7 dígitos)
    const oabRegex = /^OAB\/[A-Z]{2}\d{5,7}$/;
    if (!oabRegex.test(profile.oab)) {
      toast({
        title: 'Erro',
        description: 'OAB inválida. Use o formato: OAB/UF seguido de 5 a 7 dígitos (ex: OAB/SP123456)',
        variant: 'error'
      });
      return;
    }

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

    // Validação de força de senha
    if (password.novaSenha.length < 8) {
      toast({ title: 'Erro', description: 'A senha deve ter no mínimo 8 caracteres', variant: 'error' });
      return;
    }
    if (!/[A-Z]/.test(password.novaSenha)) {
      toast({ title: 'Erro', description: 'A senha deve conter pelo menos uma letra maiúscula', variant: 'error' });
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password.novaSenha)) {
      toast({ title: 'Erro', description: 'A senha deve conter pelo menos um caractere especial', variant: 'error' });
      return;
    }

    setShowPasswordConfirmDialog(true);
  };

  const confirmPasswordUpdate = async () => {
    try {
      await api.put('/advogado/perfil/senha', {
        senhaAtual: password.senhaAtual,
        novaSenha: password.novaSenha,
      });
      toast({ title: 'Sucesso', description: 'Senha alterada com sucesso', variant: 'success' });
      setPassword({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      setShowPasswordConfirmDialog(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao alterar senha', variant: 'error' });
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !emailPassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'error' });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ title: 'Erro', description: 'Email inválido', variant: 'error' });
      return;
    }

    setUpdatingEmail(true);
    try {
      await api.put('/advogado/perfil/email', {
        email: newEmail,
        senhaAtual: emailPassword,
      });
      toast({ title: 'Sucesso', description: 'Email atualizado com sucesso', variant: 'success' });
      setProfile({ ...profile, email: newEmail });
      setShowEmailDialog(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao atualizar email', variant: 'error' });
    } finally {
      setUpdatingEmail(false);
    }
  };

  // Validação visual de comparação de senhas
  const passwordsMatch = useMemo(() => {
    if (!password.novaSenha || !password.confirmarSenha) return null;
    return password.novaSenha === password.confirmarSenha;
  }, [password.novaSenha, password.confirmarSenha]);

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
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewEmail(profile.email);
                    setShowEmailDialog(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Alterar
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="oab">OAB</Label>
              <Input
                id="oab"
                value={profile.oab}
                onChange={(e) => setProfile({ ...profile, oab: formatOAB(e.target.value) })}
                placeholder="Ex: OAB/SP123456"
                maxLength={15}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Formato: OAB/UF seguido de 5 a 7 dígitos (ex: OAB/SP123456)</p>
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={profile.telefone}
                onChange={(e) => setProfile({ ...profile, telefone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
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
              <PasswordInput
                id="senhaAtual"
                value={password.senhaAtual}
                onChange={(e) => setPassword({ ...password, senhaAtual: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <PasswordInput
                id="novaSenha"
                value={password.novaSenha}
                onChange={(e) => setPassword({ ...password, novaSenha: e.target.value })}
                showStrength={true}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
              <div className="relative">
                <PasswordInput
                  id="confirmarSenha"
                  value={password.confirmarSenha}
                  onChange={(e) => setPassword({ ...password, confirmarSenha: e.target.value })}
                  required
                />
                {passwordsMatch !== null && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {passwordsMatch ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">As senhas coincidem</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">As senhas não coincidem</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button type="submit">Alterar Senha</Button>
          </form>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de alteração de email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Email</DialogTitle>
            <DialogDescription>
              Por segurança, confirme sua senha atual para alterar o email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newEmail">Novo Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="emailPassword">Senha Atual</Label>
              <PasswordInput
                id="emailPassword"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailDialog(false);
                setNewEmail('');
                setEmailPassword('');
              }}
              disabled={updatingEmail}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateEmail} disabled={updatingEmail}>
              {updatingEmail ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de alteração de senha */}
      <Dialog open={showPasswordConfirmDialog} onOpenChange={setShowPasswordConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Senha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja alterar sua senha? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={confirmPasswordUpdate}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
