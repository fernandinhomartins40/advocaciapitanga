'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ClienteSidebar } from '@/components/cliente/Sidebar';
import { ClienteMobileNav } from '@/components/cliente/MobileNav';
import { ClienteMobileHeader } from '@/components/cliente/MobileHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'CLIENTE')) {
      router.push('/login?type=cliente');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== 'CLIENTE') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ClienteSidebar />
      <ClienteMobileHeader />
      <main className="flex-1 overflow-y-auto pt-16 pb-20 lg:pt-0 lg:pb-0">
        <div className="container mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
      <ClienteMobileNav />
    </div>
  );
}
