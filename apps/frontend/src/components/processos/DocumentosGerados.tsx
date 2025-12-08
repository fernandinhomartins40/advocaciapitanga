'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Edit, FileText, Trash2, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';

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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [documentoEdit, setDocumentoEdit] = useState<DocumentoProcesso | null>(null);
  const [conteudoEditado, setConteudoEditado] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleEdit = (documento: DocumentoProcesso) => {
    setDocumentoEdit(documento);
    setConteudoEditado(documento.conteudoHTML);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!documentoEdit) return;

    setIsSaving(true);
    try {
      await api.put(`/documentos-processo/${documentoEdit.id}`, {
        conteudoHTML: conteudoEditado,
      });

      toast({
        title: 'Sucesso',
        description: 'Documento atualizado com sucesso',
        variant: 'success',
      });

      queryClient.invalidateQueries({ queryKey: ['processo', processoId] });
      setIsEditOpen(false);
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
    try {
      const response = await api.post(
        `/documentos-processo/${documentoId}/exportar`,
        { formato },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${titulo}.${formato.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: `Documento exportado em ${formato}`,
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao exportar documento',
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (documentoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await api.delete(`/documentos-processo/${documentoId}`);

      toast({
        title: 'Sucesso',
        description: 'Documento excluído com sucesso',
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
              Use a IA Jurídica para gerar documentos vinculados a este processo
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
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary-600" />
                    <h3 className="font-semibold text-lg">{doc.titulo}</h3>
                    <Badge variant="outline">v{doc.versao}</Badge>
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(doc)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(doc.id, 'PDF', doc.titulo)}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4" />
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Documento - {documentoEdit?.titulo}
              {documentoEdit && (
                <Badge variant="outline" className="ml-2">
                  v{documentoEdit.versao}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="conteudo">Conteúdo do Documento</Label>
              <Textarea
                id="conteudo"
                value={conteudoEditado}
                onChange={(e) => setConteudoEditado(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ao salvar, a versão será incrementada automaticamente
              </p>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(documentoEdit!.id, 'PDF', documentoEdit!.titulo)}
                  disabled={isExporting}
                >
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(documentoEdit!.id, 'DOCX', documentoEdit!.titulo)}
                  disabled={isExporting}
                >
                  Exportar DOCX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(documentoEdit!.id, 'TXT', documentoEdit!.titulo)}
                  disabled={isExporting}
                >
                  Exportar TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(documentoEdit!.id, 'RTF', documentoEdit!.titulo)}
                  disabled={isExporting}
                >
                  Exportar RTF
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
