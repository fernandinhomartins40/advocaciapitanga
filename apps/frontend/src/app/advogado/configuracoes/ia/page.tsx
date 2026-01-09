'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative as Select } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Check, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function ConfiguracaoIAPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modeloGPT, setModeloGPT] = useState('gpt-4');
  const [cabecalho, setCabecalho] = useState('');
  const [rodape, setRodape] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      setLoading(true);
      const response = await api.get('/configuracao-ia');
      setConfig(response.data);
      setModeloGPT(response.data.modeloGPT || 'gpt-4');
      setCabecalho(response.data.cabecalho || '');
      setRodape(response.data.rodape || '');
      setApiKey(response.data.apiKeyConfigurada ? '••••••••' : '');
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar configurações', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);
      await api.put('/configuracao-ia', {
        openaiApiKey: apiKey !== '••••••••' ? apiKey : undefined,
        modeloGPT,
        cabecalho,
        rodape
      });
      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso!', variant: 'success' });
      carregarConfiguracao();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao salvar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestarConexao = async () => {
    if (!apiKey || apiKey === '••••••••') {
      toast({ title: 'Atenção', description: 'Digite uma API Key válida para testar', variant: 'error' });
      return;
    }

    try {
      setTesting(true);
      const response = await api.post('/configuracao-ia/testar', { openaiApiKey: apiKey });
      toast({ title: 'Sucesso', description: response.data.message, variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Erro ao testar conexão', variant: 'error' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações de IA</h1>
        <p className="text-gray-500">Configure a integração com OpenAI ChatGPT e personalize seus documentos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API OpenAI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API Key OpenAI *</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1"
              />
              <Button onClick={handleTestarConexao} disabled={testing} variant="outline" className="w-full sm:w-auto">
                {testing ? <LoadingSpinner size="sm" /> : 'Testar'}
              </Button>
            </div>
            {config?.apiKeyConfigurada && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <Check className="h-4 w-4" /> API Key configurada
              </p>
            )}
            {!config?.apiKeyConfigurada && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Configure sua API Key para usar a IA Jurídica
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="modelo">Modelo GPT</Label>
            <Select id="modelo" value={modeloGPT} onChange={(e) => setModeloGPT(e.target.value)}>
              <option value="gpt-4">GPT-4 (Recomendado - Mais preciso)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (Rápido e preciso)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais rápido e econômico)</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              O modelo GPT-4 oferece maior qualidade e precisão nas respostas jurídicas
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalização de Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cabecalho">Cabeçalho Personalizado</Label>
            <Textarea
              id="cabecalho"
              value={cabecalho}
              onChange={(e) => setCabecalho(e.target.value)}
              placeholder="Ex: Advocacia Pitanga - OAB/SP 12345 - advogado@email.com"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Será exibido no topo de todos os documentos exportados
            </p>
          </div>

          <div>
            <Label htmlFor="rodape">Rodapé Personalizado</Label>
            <Textarea
              id="rodape"
              value={rodape}
              onChange={(e) => setRodape(e.target.value)}
              placeholder="Ex: Rua Exemplo, 123 - Centro - São Paulo/SP - Telefone: (11) 1234-5678"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Será exibido no rodapé de todos os documentos exportados
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSalvar} disabled={saving} className="w-full" size="lg">
        {saving ? (
          <>
            <LoadingSpinner size="sm" />
            <span className="ml-2">Salvando...</span>
          </>
        ) : (
          'Salvar Configurações'
        )}
      </Button>
    </div>
  );
}
