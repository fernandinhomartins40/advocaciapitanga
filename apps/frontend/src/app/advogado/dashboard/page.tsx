'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import { useDashboardStats, useProcessos } from '@/hooks/useProcessos';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: processosData, isLoading: processosLoading } = useProcessos({ limit: 5 });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statusColors: Record<string, "default" | "success" | "warning" | "danger"> = {
    EM_ANDAMENTO: 'default',
    SUSPENSO: 'warning',
    CONCLUIDO: 'success',
    ARQUIVADO: 'default',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Bem-vindo ao painel de controle</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClientes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Processos
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProcessos || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Em Andamento
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.processosEmAndamento || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mensagens Não Lidas
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.mensagensNaoLidas || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processos por Status */}
      <Card>
        <CardHeader>
          <CardTitle>Processos por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats?.processosPorStatus?.map((item: { status: string; count: number }) => (
              <div key={item.status} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">{item.status.replace('_', ' ')}</p>
                <p className="text-3xl font-bold text-primary-600">{item.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processos Recentes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Processos Recentes</CardTitle>
            <Link href="/advogado/processos" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Ver todos</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {processosLoading ? (
            <LoadingSpinner />
          ) : processosData?.processos?.length > 0 ? (
            <div className="space-y-4">
              {processosData.processos.slice(0, 5).map((processo: any) => (
                <div
                  key={processo.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{processo.numero}</h3>
                      <Badge variant={statusColors[processo.status] as any}>
                        {processo.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{processo.cliente.user.nome}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(processo.dataInicio)}
                    </p>
                  </div>
                  <Link href={`/advogado/processos/${processo.id}`} className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">Ver detalhes</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Nenhum processo encontrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
