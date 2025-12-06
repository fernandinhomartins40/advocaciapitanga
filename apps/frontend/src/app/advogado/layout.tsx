'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/advogado/Sidebar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function AdvogadoLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdvogado } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !isAdvogado)) {
      router.push('/login?type=advogado');
    }
  }, [user, isLoading, isAdvogado, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !isAdvogado) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
