'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Eye, FileText, Download, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';

export default function HistoricoIAPage() {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/ia/historico?page=${page}&limit=20`);
      setDocumentos(response.data.documentos);
      setPagination(response.data.pagination);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar histórico', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const visualizarDocumento = async (id: string) => {
    try {
      const response = await api.get(`/ia/documento/${id}`);
      setDocumentoSelecionado(response.data);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar documento', variant: 'error' });
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (documentoSelecionado) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setDocumentoSelecionado(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{documentoSelecionado.tipoPeca}</h1>
            <p className="text-gray-500">Gerado em {formatarData(documentoSelecionado.createdAt)}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {documentoSelecionado.cliente && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Cliente:</p>
                <p className="text-sm text-gray-900">{documentoSelecionado.cliente.user.nome}</p>
                {documentoSelecionado.cliente.user.email && (
                  <p className="text-xs text-gray-500">{documentoSelecionado.cliente.user.email}</p>
                )}
              </div>
            )}

            {documentoSelecionado.processo && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Processo:</p>
                <p className="text-sm text-gray-900">{documentoSelecionado.processo.numero}</p>
                <p className="text-xs text-gray-500">{documentoSelecionado.processo.descricao}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-700">Contexto:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{documentoSelecionado.contexto}</p>
            </div>

            {documentoSelecionado.fundamentosLegais && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Fundamentos Legais:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{documentoSelecionado.fundamentosLegais}</p>
              </div>
            )}

            {documentoSelecionado.pedidos && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Pedidos:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{documentoSelecionado.pedidos}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conteúdo Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="bg-white p-8 rounded-md border border-gray-200 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: documentoSelecionado.conteudoGerado }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Documentos IA</h1>
          <p className="text-gray-500">Todos os documentos gerados pela Inteligência Artificial</p>
        </div>
        <Link href="/advogado/ia-juridica">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      {documentos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum documento gerado ainda</h3>
            <p className="text-gray-500 mb-4">
              Comece gerando sua primeira peça jurídica com IA
            </p>
            <Link href="/advogado/ia-juridica">
              <Button>Gerar Documento</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {documentos.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span>{doc.tipoPeca}</span>
                    </CardTitle>
                    <Button size="sm" onClick={() => visualizarDocumento(doc.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {doc.cliente && (
                        <div>
                          <span className="text-gray-500 font-semibold">Cliente:</span>
                          <p className="text-gray-900">{doc.cliente.user.nome}</p>
                        </div>
                      )}
                      {doc.processo && (
                        <div>
                          <span className="text-gray-500 font-semibold">Processo:</span>
                          <p className="text-gray-900">{doc.processo.numero}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1 font-semibold">Preview:</p>
                    <div
                      className="text-sm text-gray-700 line-clamp-3 prose-sm"
                      dangerouslySetInnerHTML={{
                        __html: doc.conteudoGerado?.substring(0, 300) + '...' || doc.contexto
                      }}
                    />
                  </div>
                  <div className="mt-3 flex justify-end text-xs text-gray-500">
                    <span>{formatarData(doc.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => carregarHistorico(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  let page = i + 1;
                  if (pagination.totalPages > 5 && pagination.page > 3) {
                    page = pagination.page - 2 + i;
                  }
                  if (page > pagination.totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={page === pagination.page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => carregarHistorico(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => carregarHistorico(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
