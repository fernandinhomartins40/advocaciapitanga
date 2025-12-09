'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Brain, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const mobileMenuItems = [
  { href: '/advogado/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/advogado/clientes', icon: Users, label: 'Clientes' },
  { href: '/advogado/processos', icon: FileText, label: 'Processos' },
  { href: '/advogado/ia-juridica', icon: Brain, label: 'IA' },
  { href: '/advogado/perfil', icon: User, label: 'Perfil' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-primary-900 border-t border-primary-800 lg:hidden">
      <ul className="flex items-center justify-around">
        {mobileMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors",
                  isActive
                    ? "text-white bg-primary-800"
                    : "text-primary-200 hover:text-white hover:bg-primary-800/50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
