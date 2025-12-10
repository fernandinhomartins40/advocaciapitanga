'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useAdvogados() {
  return useQuery({
    queryKey: ['advogados'],
    queryFn: async () => {
      const response = await api.get('/advogados');
      return response.data;
    },
  });
}
