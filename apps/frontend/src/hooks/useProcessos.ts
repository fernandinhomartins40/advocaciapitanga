'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Processo } from '@/types';

export function useProcessos(filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['processos', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/processos?${params.toString()}`);
      return response.data;
    },
  });
}

export function useProcesso(id: string) {
  return useQuery({
    queryKey: ['processo', id],
    queryFn: async () => {
      const response = await api.get(`/processos/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/processos', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
    },
  });
}

export function useUpdateProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/processos/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
    },
  });
}

export function useDeleteProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/processos/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/processos/dashboard/stats');
      return response.data;
    },
  });
}

// ====================
// HOOKS PROJUDI
// ====================

/**
 * Hook para iniciar consulta PROJUDI e obter CAPTCHA (processo existente)
 */
export function useIniciarCaptchaProjudi() {
  return useMutation({
    mutationFn: async (processoId: string) => {
      const response = await api.post(`/projudi/processos/${processoId}/iniciar-captcha`);
      return response.data;
    },
  });
}

/**
 * Hook para iniciar CAPTCHA no auto-cadastro (processo novo)
 */
export function useIniciarCaptchaAutoCadastro() {
  return useMutation({
    mutationFn: async (numeroProcesso: string) => {
      const response = await api.post('/projudi/auto-cadastro/iniciar-captcha', {
        numeroProcesso
      });
      return response.data;
    },
  });
}

/**
 * Hook para consultar PROJUDI no auto-cadastro (apenas extrai dados)
 */
export function useConsultarAutoCadastro() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      captchaResposta
    }: {
      sessionId: string;
      captchaResposta: string;
    }) => {
      const response = await api.post('/projudi/auto-cadastro/consultar', {
        sessionId,
        captchaResposta
      });
      return response.data;
    },
  });
}

/**
 * Hook para auto-cadastrar processo via PROJUDI (com dados já extraídos)
 */
export function useAutoCadastrarProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: any) => {
      // Extrair clienteId se existir, o restante vai em dadosExtraidos
      const { clienteId, ...dadosExtraidos } = dados;

      const payload: any = { dadosExtraidos };

      // Se clienteId foi fornecido, incluir no payload
      if (clienteId) {
        payload.clienteId = clienteId;
      }

      const response = await api.post('/projudi/processos/auto-cadastrar', payload);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar lista de processos
      queryClient.invalidateQueries({ queryKey: ['processos'] });
    },
  });
}

/**
 * Hook para consultar PROJUDI com CAPTCHA resolvido
 */
export function useConsultarComCaptcha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      processoId,
      sessionId,
      captchaResposta
    }: {
      processoId: string;
      sessionId: string;
      captchaResposta: string;
    }) => {
      const response = await api.post(`/projudi/processos/${processoId}/consultar-captcha`, {
        sessionId,
        captchaResposta
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries do processo atualizado
      queryClient.invalidateQueries({ queryKey: ['processo', variables.processoId] });
      queryClient.invalidateQueries({ queryKey: ['processos'] });
    },
  });
}




