'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function DocumentosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['documentos'],
    queryFn: async () => {
      const response = await api.get('/documentos');
      return response.data;
    },
  });

  const handleDownload = async (id: string, titulo: string) => {
    try {
      const response = await api.get(`/documentos/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = titulo;
      link.click();
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
        <p className="text-gray-500">Todos os documentos dos processos</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data?.documentos?.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.documentos.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-12 w-12 text-primary-600 mb-2" />
                <CardTitle className="text-lg">{doc.titulo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Processo:</span>{' '}
                    {doc.processo?.numero || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Tipo:</span> {doc.tipo}
                  </div>
                  <div>
                    <span className="font-semibold">Tamanho:</span>{' '}
                    {(doc.tamanho / 1024).toFixed(2)} KB
                  </div>
                  <div>
                    <span className="font-semibold">Data:</span>{' '}
                    {formatDate(doc.createdAt)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => handleDownload(doc.id, doc.titulo)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nenhum documento encontrado
          </CardContent>
        </Card>
      )}
    </div>
  );
}
