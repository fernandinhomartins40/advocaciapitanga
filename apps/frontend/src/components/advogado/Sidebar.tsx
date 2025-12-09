'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scale, LayoutDashboard, Users, FileText, FolderOpen, Brain, User, LogOut, UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const allMenuItems = [
  { href: '/advogado/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/advogado/clientes', icon: Users, label: 'Clientes' },
  { href: '/advogado/processos', icon: FileText, label: 'Processos' },
  { href: '/advogado/documentos', icon: FolderOpen, label: 'Documentos' },
  { href: '/advogado/ia-juridica', icon: Brain, label: 'IA Jurídica' },
  { href: '/advogado/equipe', icon: UsersIcon, label: 'Equipe', adminOnly: true },
  { href: '/advogado/perfil', icon: User, label: 'Perfil' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user, isAdmin } = useAuth();

  // Filtrar itens do menu baseado nas permissões
  const menuItems = allMenuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen w-64 flex-col bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6 border-b border-primary-800">
        <Scale className="h-8 w-8" />
        <span className="text-xl font-bold">Advocacia Pitanga</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-primary-700 scrollbar-track-primary-900 hover:scrollbar-thumb-primary-600">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                    isActive
                      ? "bg-primary-800 text-white"
                      : "text-primary-100 hover:bg-primary-800/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-primary-800 p-4">
        <div className="mb-3 rounded-lg bg-primary-800/50 p-3">
          <p className="text-sm font-medium">{user?.nome}</p>
          <p className="text-xs text-primary-200">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-primary-100 transition-colors hover:bg-primary-800/50"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
