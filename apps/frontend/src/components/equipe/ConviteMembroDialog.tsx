'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/toast';
import { PERFIS_PERMISSOES, Permissoes } from '@/types';
import api from '@/lib/api';
import { PasswordInput } from '@/components/ui/password-input';

interface ConviteMembroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConviteMembroDialog({ open, onOpenChange, onSuccess }: ConviteMembroDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipoPermissao, setTipoPermissao] = useState<'predefinido' | 'personalizado'>('predefinido');

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'ADVOGADO' as 'ADVOGADO' | 'ASSISTENTE' | 'ESTAGIARIO',
    oab: '',
    telefone: '',
    password: '',
    confirmPassword: '',
  });

  const [permissoes, setPermissoes] = useState<Partial<Permissoes>>(PERFIS_PERMISSOES.ADVOGADO);

  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { label: 'Vazia', color: 'text-gray-400', score: 0 };

    const checks = [
      pwd.length >= 8,
      /[A-Z]/.test(pwd),
      /[a-z]/.test(pwd),
      /\d/.test(pwd),
      /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    ];

    const score = checks.filter(Boolean).length;

    if (score >= 4) return { label: 'Forte', color: 'text-green-600', score };
    if (score === 3) return { label: 'Média', color: 'text-yellow-600', score };
    return { label: 'Fraca', color: 'text-red-600', score };
  }, [formData.password]);

  const handleRoleChange = (role: 'ADVOGADO' | 'ASSISTENTE' | 'ESTAGIARIO') => {
    setFormData({ ...formData, role });
    if (tipoPermissao === 'predefinido') {
      setPermissoes(PERFIS_PERMISSOES[role]);
    }
  };

  const handlePermissaoChange = (key: keyof Permissoes, value: boolean) => {
    setPermissoes({ ...permissoes, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.role) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'error' });
      return;
    }

    if (formData.role === 'ADVOGADO' && !formData.oab) {
      toast({ title: 'Erro', description: 'OAB é obrigatória para advogados', variant: 'error' });
      return;
    }

    if (!formData.password || !formData.confirmPassword) {
      toast({ title: 'Erro', description: 'Preencha e confirme a senha do novo usuário', variant: 'error' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'error' });
      return;
    }

    const senhaValida =
      formData.password.length >= 8 &&
      /[A-Z]/.test(formData.password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    if (!senhaValida) {
      toast({
        title: 'Erro',
        description: 'Senha inválida. Use 8+ caracteres, 1 letra maiúscula e 1 caractere especial.',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        role: formData.role,
        oab: formData.oab,
        telefone: formData.telefone,
        password: formData.password,
        permissoes: tipoPermissao === 'personalizado' ? permissoes : undefined,
      };

      const response = await api.post('/escritorio/membros', payload);

      const senhaInfo = response.data?.senhaTemporaria
        ? `Senha temporária: ${response.data.senhaTemporaria}`
        : 'Senha definida pelo administrador.';

      toast({
        title: 'Sucesso',
        description: `Membro adicionado! ${senhaInfo}`,
        variant: 'success',
      });

      // Resetar formulário
      setFormData({
        nome: '',
        email: '',
        role: 'ADVOGADO',
        oab: '',
        telefone: '',
        password: '',
        confirmPassword: '',
      });
      setPermissoes(PERFIS_PERMISSOES.ADVOGADO);
      setTipoPermissao('predefinido');

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao adicionar membro',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Membro</DialogTitle>
          <DialogDescription>
            Preencha os dados para adicionar um novo membro à equipe. Um email com senha temporária será enviado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Básicos */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="João Silva"
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
                placeholder="joao@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Cargo *</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVOGADO">Advogado</SelectItem>
                  <SelectItem value="ASSISTENTE">Assistente Jurídico</SelectItem>
                  <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'ADVOGADO' && (
              <div>
                <Label htmlFor="oab">OAB *</Label>
                <Input
                  id="oab"
                  value={formData.oab}
                  onChange={(e) => setFormData({ ...formData, oab: e.target.value.toUpperCase() })}
                  placeholder="Ex: SP123456"
                  maxLength={10}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="password">Senha do novo usuário *</Label>
                <PasswordInput
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Pelo menos 8 caracteres"
                  required
                />
                <p className={`text-xs mt-1 ${passwordStrength.color}`}>
                  Força da senha: {passwordStrength.label}
                </p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Requisitos: mínimo 8 caracteres, ao menos 1 letra maiúscula e 1 caractere especial.
            </p>
          </div>

          {/* Permissões */}
          <div className="border-t pt-4">
            <Label className="text-base">Permissões</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="predefinido"
                  checked={tipoPermissao === 'predefinido'}
                  onChange={() => {
                    setTipoPermissao('predefinido');
                    setPermissoes(PERFIS_PERMISSOES[formData.role]);
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="predefinido" className="cursor-pointer">
                  Usar perfil predefinido do cargo
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="personalizado"
                  checked={tipoPermissao === 'personalizado'}
                  onChange={() => setTipoPermissao('personalizado')}
                  className="h-4 w-4"
                />
                <Label htmlFor="personalizado" className="cursor-pointer">
                  Personalizar permissões
                </Label>
              </div>
            </div>

            {tipoPermissao === 'personalizado' && (
              <div className="mt-4 grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                {Object.entries({
                  gerenciarUsuarios: 'Gerenciar usuários',
                  gerenciarTodosProcessos: 'Gerenciar todos os processos',
                  gerenciarProcessosProprios: 'Gerenciar processos próprios',
                  visualizarOutrosProcessos: 'Visualizar outros processos',
                  gerenciarClientes: 'Gerenciar clientes',
                  visualizarClientes: 'Visualizar clientes',
                  gerenciarIA: 'Usar IA Jurídica',
                  configurarSistema: 'Configurar sistema',
                  visualizarRelatorios: 'Visualizar relatórios',
                  exportarDados: 'Exportar dados',
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={permissoes[key as keyof Permissoes] || false}
                      onCheckedChange={(checked) =>
                        handlePermissaoChange(key as keyof Permissoes, checked as boolean)
                      }
                    />
                    <Label htmlFor={key} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar Membro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
