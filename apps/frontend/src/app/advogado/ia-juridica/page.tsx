'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Download, FileText, Copy } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function IAJuridicaPage() {
  const [tipoPeca, setTipoPeca] = useState('Petição Inicial');
  const [contexto, setContexto] = useState('');
  const [fundamentosLegais, setFundamentosLegais] = useState('');
  const [pedidos, setPedidos] = useState('');
  const [partes, setPartes] = useState('');
  const [conteudoGerado, setConteudoGerado] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const tiposPeca = [
    'Petição Inicial',
    'Contestação',
    'Recurso',
    'Agravo',
    'Apelação',
    'Contrato',
    'Parecer',
    'Outro',
  ];

  const handleGenerate = async () => {
    if (!contexto.trim()) {
      toast({ title: 'Atenção', description: 'Preencha o contexto', variant: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post('/ia/gerar-peca', {
        tipoPeca,
        contexto,
        fundamentosLegais,
        pedidos,
        partes: partes.split('\n').filter(p => p.trim()),
      });
      setConteudoGerado(response.data.conteudo);
      toast({ title: 'Sucesso', description: 'Peça gerada com sucesso', variant: 'success' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao gerar peça',
        variant: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!conteudoGerado) return;

    try {
      const response = await api.post(
        '/ia/exportar-pdf',
        { conteudo: conteudoGerado, titulo: tipoPeca },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tipoPeca}.pdf`;
      link.click();
      toast({ title: 'Sucesso', description: 'PDF exportado', variant: 'success' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao exportar PDF', variant: 'error' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(conteudoGerado);
    toast({ title: 'Copiado', description: 'Texto copiado para área de transferência', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">IA Jurídica</h1>
        <p className="text-gray-500">Geração automática de peças jurídicas com Inteligência Artificial</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar - Formulário */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tipo">Tipo de Peça</Label>
              <Select
                id="tipo"
                value={tipoPeca}
                onChange={(e) => setTipoPeca(e.target.value)}
              >
                {tiposPeca.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="contexto">Contexto / Descrição *</Label>
              <Textarea
                id="contexto"
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="Descreva o contexto da peça jurídica..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="fundamentos">Fundamentos Legais</Label>
              <Textarea
                id="fundamentos"
                value={fundamentosLegais}
                onChange={(e) => setFundamentosLegais(e.target.value)}
                placeholder="Art. 123 do CPC, Lei 1234/2020..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="pedidos">Pedidos</Label>
              <Textarea
                id="pedidos"
                value={pedidos}
                onChange={(e) => setPedidos(e.target.value)}
                placeholder="Liste os pedidos..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="partes">Partes (uma por linha)</Label>
              <Textarea
                id="partes"
                value={partes}
                onChange={(e) => setPartes(e.target.value)}
                placeholder="Autor: João da Silva&#10;Réu: Maria Santos"
                rows={3}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !contexto.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Gerando...</span>
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Gerar Peça com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {tipoPeca}
              </CardTitle>
              {conteudoGerado && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-1" />
                    Exportar PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={conteudoGerado}
              onChange={(e) => setConteudoGerado(e.target.value)}
              placeholder="O conteúdo gerado pela IA aparecerá aqui. Você poderá editar o texto livremente."
              rows={25}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
