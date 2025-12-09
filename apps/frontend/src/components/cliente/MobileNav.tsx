'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, FolderOpen, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileMenuItems = [
  { href: '/cliente/meus-processos', icon: FileText, label: 'Processos' },
  { href: '/cliente/documentos', icon: FolderOpen, label: 'Docs' },
  { href: '/cliente/mensagens', icon: MessageSquare, label: 'Msgs' },
  { href: '/cliente/perfil', icon: User, label: 'Perfil' },
];

export function ClienteMobileNav() {
  const pathname = usePathname();

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
