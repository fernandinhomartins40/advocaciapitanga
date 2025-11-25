'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'ADVOGADO' | 'CLIENTE';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdvogado: boolean;
  isCliente: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Tentar carregar o usuário usando o cookie httpOnly
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      // Se falhar, o usuário não está autenticado
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user } = response.data;

      setUser(user);

      // Redirecionar baseado no role
      if (user.role === 'ADVOGADO') {
        router.push('/advogado/dashboard');
      } else {
        router.push('/cliente/meus-processos');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erro ao fazer login');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAdvogado: user?.role === 'ADVOGADO',
    isCliente: user?.role === 'CLIENTE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
