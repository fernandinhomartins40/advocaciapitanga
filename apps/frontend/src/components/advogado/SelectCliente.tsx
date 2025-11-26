'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface Cliente {
  id: string;
  user: {
    nome: string;
    email: string;
  };
  cpf: string;
  telefone?: string;
  endereco?: string;
}

interface SelectClienteProps {
  value?: string;
  onChange: (clienteId: string, clienteData: Cliente | null) => void;
  label?: string;
  required?: boolean;
}

export default function SelectCliente({
  value,
  onChange,
  label = 'Cliente',
  required = false
}: SelectClienteProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clientes');
      setClientes(response.data.clientes || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao carregar clientes',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clienteId = e.target.value;
    const clienteSelecionado = clientes.find(c => c.id === clienteId);
    onChange(clienteId, clienteSelecionado || null);
  };

  return (
    <div>
      <Label htmlFor="cliente">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        id="cliente"
        value={value || ''}
        onChange={handleChange}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Carregando...' : 'Selecione um cliente (opcional)'}
        </option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.user.nome} - {cliente.cpf}
          </option>
        ))}
      </Select>
    </div>
  );
}
