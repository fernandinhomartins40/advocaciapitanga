'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdvancedRichTextEditor } from '@/components/shared/AdvancedRichTextEditor';
import { Edit, FileText, Trash2, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface DocumentoProcesso {
  id: string;
  titulo: string;
  conteudoHTML: string;
  versao: number;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    nome: string;
  };
}

interface DocumentosGeradosProps {
  processoId: string;
  documentos: DocumentoProcesso[];
}

export function DocumentosGerados({ processoId, documentos }: DocumentosGeradosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documentoEditId, setDocumentoEditId] = useState<string | null>(null);
  const [conteudoEditado, setConteudoEditado] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleEdit = (documento: DocumentoProcesso) => {
    setDocumentoEditId(documento.id);
    setConteudoEditado(documento.conteudoHTML);
  };

  const handleSave = async () => {
    if (!documentoEditId) return;

    setIsSaving(true);
    try {
      await api.put(`/documentos-processo/${documentoEditId}`, {
        conteudoHTML: conteudoEditado,
      });

      toast({
        title: 'Sucesso',
        description: 'Documento atualizado com sucesso',
        variant: 'success',
      });

      queryClient.invalidateQueries({ queryKey: ['processo', processoId] });
      setDocumentoEditId(null);
      setConteudoEditado('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao atualizar documento',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (documentoId: string, formato: string, titulo: string) => {
    setIsExporting(true);
    let url: string | null = null;
    const formatoNormalizado = formato.toLowerCase();

    try {
      const response = await api.post(
        `/documentos-processo/${documentoId}/exportar`,
        { formato: formatoNormalizado },
        { responseType: 'blob' }
      );

      // Criar URL do blob
      url = window.URL.createObjectURL(new Blob([response.data]));

      // Criar link temporario e simular clique
      const link = document.createElement('a');
      link.href = url;
      link.download = `${titulo}.${formatoNormalizado}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Sucesso',
        description: `Documento exportado em ${formato}`,
        variant: 'success',
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erro ao exportar documento';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'error',
      });
    } finally {
      // SEMPRE revogar URL para liberar memoria
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      setIsExporting(false);
    }
  };

  const handleDelete = async (documentoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await api.delete(`/documentos-processo/${documentoId}`);

      toast({
        title: 'Sucesso',
        description: 'Documento excluido com sucesso',
        variant: 'success',
      });

      queryClient.invalidateQueries({ queryKey: ['processo', processoId] });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao excluir documento',
        variant: 'error',
      });
    }
  };

  if (!documentos || documentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">Nenhum documento gerado</p>
            <p className="text-sm mt-2">
              Use a IA Juridica para gerar documentos vinculados a este processo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="space-y-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      <h3 className="font-semibold text-lg">{doc.titulo}</h3>
                      <Badge variant="info">v{doc.versao}</Badge>
                    </div>

                    {doc.template && (
                      <p className="text-sm text-gray-600 mb-1">
                        Template: {doc.template.nome}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Criado em {formatDate(doc.createdAt)}</span>
                      {doc.updatedAt !== doc.createdAt && (
                        <span>Atualizado em {formatDate(doc.updatedAt)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(doc)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(doc.id, 'PDF', doc.titulo)}
                      disabled={isExporting}
                    >
                      {isExporting ? <LoadingSpinner size="sm" /> : 'Exportar PDF'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(doc.id, 'DOCX', doc.titulo)}
                      disabled={isExporting}
                    >
                      {isExporting ? <LoadingSpinner size="sm" /> : 'Exportar DOCX'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(doc.id, 'TXT', doc.titulo)}
                      disabled={isExporting}
                    >
                      {isExporting ? <LoadingSpinner size="sm" /> : 'Exportar TXT'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(doc.id, 'RTF', doc.titulo)}
                      disabled={isExporting}
                    >
                      {isExporting ? <LoadingSpinner size="sm" /> : 'Exportar RTF'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  {documentoEditId === doc.id ? (
                    <div className="space-y-3">
                      <AdvancedRichTextEditor
                        content={conteudoEditado}
                        onChange={setConteudoEditado}
                        minHeight="220px"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDocumentoEditId(null);
                            setConteudoEditado('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? 'Salvando...' : 'Salvar Alteracoes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <AdvancedRichTextEditor
                      content={doc.conteudoHTML}
                      editable={false}
                      minHeight="220px"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

