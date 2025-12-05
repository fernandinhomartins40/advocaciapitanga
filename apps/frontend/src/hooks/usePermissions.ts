import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { Permissoes } from '@/types';

/**
 * Hook para verificar permissões do usuário
 * ADMIN_ESCRITORIO tem todas as permissões automaticamente
 * Outros roles verificam permissões do membroEscritorio
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissions: Permissoes = useMemo(() => {
    // ADMIN_ESCRITORIO tem todas as permissões
    if (user?.role === 'ADMIN_ESCRITORIO') {
      return {
        gerenciarUsuarios: true,
        gerenciarTodosProcessos: true,
        gerenciarProcessosProprios: true,
        visualizarOutrosProcessos: true,
        gerenciarClientes: true,
        visualizarClientes: true,
        gerenciarIA: true,
        configurarSistema: true,
        visualizarRelatorios: true,
        exportarDados: true,
      };
    }

    // CLIENTE não tem permissões de escritório
    if (user?.role === 'CLIENTE' || !user) {
      return {
        gerenciarUsuarios: false,
        gerenciarTodosProcessos: false,
        gerenciarProcessosProprios: false,
        visualizarOutrosProcessos: false,
        gerenciarClientes: false,
        visualizarClientes: false,
        gerenciarIA: false,
        configurarSistema: false,
        visualizarRelatorios: false,
        exportarDados: false,
      };
    }

    // Membros do escritório pegam permissões do membroEscritorio
    if (user.membroEscritorio) {
      return {
        gerenciarUsuarios: user.membroEscritorio.gerenciarUsuarios,
        gerenciarTodosProcessos: user.membroEscritorio.gerenciarTodosProcessos,
        gerenciarProcessosProprios: user.membroEscritorio.gerenciarProcessosProprios,
        visualizarOutrosProcessos: user.membroEscritorio.visualizarOutrosProcessos,
        gerenciarClientes: user.membroEscritorio.gerenciarClientes,
        visualizarClientes: user.membroEscritorio.visualizarClientes,
        gerenciarIA: user.membroEscritorio.gerenciarIA,
        configurarSistema: user.membroEscritorio.configurarSistema,
        visualizarRelatorios: user.membroEscritorio.visualizarRelatorios,
        exportarDados: user.membroEscritorio.exportarDados,
      };
    }

    // Fallback: sem permissões
    return {
      gerenciarUsuarios: false,
      gerenciarTodosProcessos: false,
      gerenciarProcessosProprios: false,
      visualizarOutrosProcessos: false,
      gerenciarClientes: false,
      visualizarClientes: false,
      gerenciarIA: false,
      configurarSistema: false,
      visualizarRelatorios: false,
      exportarDados: false,
    };
  }, [user]);

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = (permission: keyof Permissoes): boolean => {
    return permissions[permission];
  };

  /**
   * Verifica se o usuário tem TODAS as permissões especificadas
   */
  const hasAllPermissions = (requiredPermissions: (keyof Permissoes)[]): boolean => {
    return requiredPermissions.every((permission) => permissions[permission]);
  };

  /**
   * Verifica se o usuário tem PELO MENOS UMA das permissões especificadas
   */
  const hasAnyPermission = (requiredPermissions: (keyof Permissoes)[]): boolean => {
    return requiredPermissions.some((permission) => permissions[permission]);
  };

  /**
   * Verifica se é admin do escritório
   */
  const isAdmin = user?.role === 'ADMIN_ESCRITORIO';

  /**
   * Verifica se é advogado (admin ou colaborador)
   */
  const isAdvogado = user?.role === 'ADMIN_ESCRITORIO' || user?.role === 'ADVOGADO';

  /**
   * Verifica se pertence a um escritório
   */
  const hasEscritorio = user?.role !== 'CLIENTE' && user?.role !== undefined;

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    isAdvogado,
    hasEscritorio,
  };
}
