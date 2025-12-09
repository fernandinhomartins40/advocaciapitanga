'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scale, Menu, X, LayoutDashboard, Users, FileText, FolderOpen, Brain, User, LogOut, UsersIcon } from 'lucide-react';
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

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {/* Header fixo no topo */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-primary-900 border-b border-primary-800 lg:hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-white" />
            <span className="text-lg font-bold text-white">Advocacia Pitanga</span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-white hover:bg-primary-800 rounded-lg transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Drawer lateral */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu lateral */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-primary-900 z-50 shadow-2xl lg:hidden overflow-y-auto">
            {/* Header do drawer */}
            <div className="flex items-center justify-between p-4 border-b border-primary-800">
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-white" />
                <span className="text-lg font-bold text-white">Menu</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-white hover:bg-primary-800 rounded-lg transition-colors"
                aria-label="Fechar menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Info do usuário */}
            <div className="p-4 border-b border-primary-800">
              <div className="rounded-lg bg-primary-800/50 p-3">
                <p className="text-sm font-medium text-white">{user?.nome}</p>
                <p className="text-xs text-primary-200">{user?.email}</p>
              </div>
            </div>

            {/* Menu items */}
            <nav className="p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
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

            {/* Logout */}
            <div className="p-4 border-t border-primary-800">
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-primary-100 transition-colors hover:bg-primary-800/50"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
