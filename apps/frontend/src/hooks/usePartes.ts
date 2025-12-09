'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function usePartesExistentes() {
  return useQuery({
    queryKey: ['partes-existentes'],
    queryFn: async () => {
      const response = await api.get('/partes');
      return response.data;
    },
  });
}
