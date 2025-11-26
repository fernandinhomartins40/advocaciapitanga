'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface Processo {
  id: string;
  numero: string;
  descricao: string;
  status: string;
  cliente: {
    user: {
      nome: string;
    };
  };
}

interface SelectProcessoProps {
  value?: string;
  onChange: (processoId: string, processoData: Processo | null) => void;
  clienteId?: string;
  label?: string;
  required?: boolean;
}

export default function SelectProcesso({
  value,
  onChange,
  clienteId,
  label = 'Processo',
  required = false
}: SelectProcessoProps) {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProcessos();
  }, [clienteId]);

  const fetchProcessos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/processos', {
        params: clienteId ? { clienteId } : {}
      });
      setProcessos(response.data.processos || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao carregar processos',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const processoId = e.target.value;
    const processoSelecionado = processos.find(p => p.id === processoId);
    onChange(processoId, processoSelecionado || null);
  };

  return (
    <div>
      <Label htmlFor="processo">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        id="processo"
        value={value || ''}
        onChange={handleChange}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Carregando...' : 'Selecione um processo (opcional)'}
        </option>
        {processos.map((processo) => (
          <option key={processo.id} value={processo.id}>
            {processo.numero} - {processo.cliente.user.nome}
          </option>
        ))}
      </Select>
      {processos.length === 0 && !loading && clienteId && (
        <p className="text-sm text-gray-500 mt-1">
          Nenhum processo encontrado para este cliente
        </p>
      )}
    </div>
  );
}
