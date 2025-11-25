'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useProcessos } from '@/hooks/useProcessos';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function MeusProcessosPage() {
  const { data, isLoading } = useProcessos();

  const statusColors: Record<string, any> = {
    EM_ANDAMENTO: 'info',
    SUSPENSO: 'warning',
    CONCLUIDO: 'success',
    ARQUIVADO: 'default',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meus Processos</h1>
        <p className="text-gray-500">Acompanhe seus processos jurídicos</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data?.processos?.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.processos.map((processo: any) => (
            <Card key={processo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary-600" />
                  <Badge variant={statusColors[processo.status]}>
                    {processo.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-lg">{processo.numero}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Advogado:</span>{' '}
                    {processo.advogado.user.nome}
                  </div>
                  <div>
                    <span className="font-semibold">Início:</span>{' '}
                    {formatDate(processo.dataInicio)}
                  </div>
                  <p className="text-gray-600 line-clamp-2 mt-2">{processo.descricao}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-3">
                    <span>📄 {processo._count?.documentos || 0} docs</span>
                    <span>💬 {processo._count?.mensagens || 0} msgs</span>
                  </div>
                </div>
                <Link href={`/cliente/meus-processos/${processo.id}`} className="block mt-4">
                  <Button variant="outline" className="w-full">
                    Ver Detalhes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Você ainda não possui processos
          </CardContent>
        </Card>
      )}
    </div>
  );
}
