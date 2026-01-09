'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Scale } from 'lucide-react';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [userType, setUserType] = useState<'ADVOGADO' | 'CLIENTE'>('ADVOGADO');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    oab: '',
    telefone: '',
    endereco: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar senhas
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validar requisitos de senha
    if (formData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      setError('A senha deve conter pelo menos um caractere especial');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
        role: userType,
        ...(userType === 'CLIENTE' ? {
          cpf: formData.cpf,
          telefone: formData.telefone,
          endereco: formData.endereco,
        } : {
          oab: formData.oab,
          telefone: formData.telefone,
        }),
      };

      await api.post('/auth/register', payload);

      // Redirecionar para página de login após registro bem-sucedido
      router.push('/login?type=' + userType.toLowerCase());
    } catch (err: any) {
      const errorMessage = err.response?.data?.errors
        ? err.response.data.errors.map((e: any) => e.msg).join(', ')
        : err.response?.data?.error || 'Erro ao criar conta';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scale className="h-12 w-12 text-primary-600" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Criar Conta</CardTitle>
          <CardDescription>Cadastre-se no Advocacia Pitanga</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Toggle de tipo de usuário */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <Button
              type="button"
              variant={userType === 'ADVOGADO' ? 'default' : 'outline'}
              className="flex-1 w-full"
              onClick={() => setUserType('ADVOGADO')}
            >
              Advogado
            </Button>
            <Button
              type="button"
              variant={userType === 'CLIENTE' ? 'default' : 'outline'}
              className="flex-1 w-full"
              onClick={() => setUserType('CLIENTE')}
            >
              Cliente
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                name="nome"
                type="text"
                placeholder="Seu nome completo"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {userType === 'CLIENTE' ? (
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="oab">OAB</Label>
                <Input
                  id="oab"
                  name="oab"
                  type="text"
                  placeholder="Ex: SP123456"
                  value={formData.oab}
                  onChange={handleChange}
                  required
                  maxLength={10}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                type="text"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={handleChange}
              />
            </div>

            {userType === 'CLIENTE' && (
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  name="endereco"
                  type="text"
                  placeholder="Seu endereço completo"
                  value={formData.endereco}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={handleChange}
                showStrength={true}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600">As senhas não coincidem</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-primary-600 hover:underline">
                Faça login
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-primary-600 hover:underline">
              Voltar para página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
