'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [userType, setUserType] = useState<'advogado' | 'cliente'>('advogado');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'cliente') {
      setUserType('cliente');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestCredentials = () => {
    if (userType === 'advogado') {
      setEmail('admin@pitanga.com');
      setPassword('Pitanga@2024!Admin');
    } else {
      setEmail('maria@email.com');
      setPassword('Pitanga@2024!Cliente');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scale className="h-12 w-12 text-primary-600" />
          </div>
          <CardTitle className="text-2xl">Advocacia Pitanga</CardTitle>
          <CardDescription>Faça login para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Toggle de tipo de usuário */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={userType === 'advogado' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setUserType('advogado')}
            >
              Advogado
            </Button>
            <Button
              type="button"
              variant={userType === 'cliente' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setUserType('cliente')}
            >
              Cliente
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="mb-3">Usar credenciais de teste:</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={fillTestCredentials}
            >
              Preencher com credenciais de {userType === 'advogado' ? 'Advogado' : 'Cliente'}
            </Button>
            <div className="mt-3 bg-gray-50 p-3 rounded text-xs">
              {userType === 'advogado' ? (
                <>
                  <p><strong>Advogado:</strong></p>
                  <p>Email: admin@pitanga.com</p>
                  <p>Senha: Pitanga@2024!Admin</p>
                </>
              ) : (
                <>
                  <p><strong>Cliente:</strong></p>
                  <p>Email: maria@email.com</p>
                  <p>Senha: Pitanga@2024!Cliente</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-primary-600 hover:underline">
              Voltar para página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
