'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export interface ClienteData {
  id?: string;
  tipoPessoa: 'FISICA' | 'JURIDICA';

  // Pessoa Física
  nome: string;
  cpf?: string;
  rg?: string;
  orgaoEmissor?: string;
  nacionalidade?: string;
  estadoCivil?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';
  profissao?: string;
  dataNascimento?: string;

  // Pessoa Jurídica
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  representanteLegal?: string;
  cargoRepresentante?: string;

  // Contato
  email: string;
  telefone?: string;
  celular?: string;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface ModalClienteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cliente: ClienteData) => void;
  clienteEdit?: ClienteData;
  isEdit?: boolean;
}

const INITIAL_STATE: ClienteData = {
  tipoPessoa: 'FISICA',
  nome: '',
  email: '',
  nacionalidade: 'Brasileiro(a)',
};

export function ModalCliente({ open, onOpenChange, onSave, clienteEdit, isEdit = false }: ModalClienteProps) {
  const [formData, setFormData] = useState<ClienteData>(INITIAL_STATE);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    if (clienteEdit) {
      setFormData(clienteEdit);
    } else {
      setFormData(INITIAL_STATE);
    }
  }, [clienteEdit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(INITIAL_STATE);
  };

  const handleCancel = () => {
    setFormData(INITIAL_STATE);
    onOpenChange(false);
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setLoadingCep(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCelular = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const isPessoaFisica = formData.tipoPessoa === 'FISICA';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Pessoa */}
          {!isEdit && (
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.tipoPessoa === 'FISICA'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoPessoa"
                    value="FISICA"
                    checked={formData.tipoPessoa === 'FISICA'}
                    onChange={(e) => setFormData({ ...formData, tipoPessoa: 'FISICA' })}
                    className="text-primary-600"
                  />
                  <span className="text-sm">Pessoa Física</span>
                </label>
                <label
                  className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.tipoPessoa === 'JURIDICA'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoPessoa"
                    value="JURIDICA"
                    checked={formData.tipoPessoa === 'JURIDICA'}
                    onChange={(e) => setFormData({ ...formData, tipoPessoa: 'JURIDICA' })}
                    className="text-primary-600"
                  />
                  <span className="text-sm">Pessoa Jurídica</span>
                </label>
              </div>
            </div>
          )}

          <hr className="my-6" />

          {/* Campos Pessoa Física */}
          {isPessoaFisica && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados Pessoais</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cpf">CPF {!isEdit && '*'}</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required={!isEdit}
                    disabled={isEdit}
                  />
                </div>

                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg || ''}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="00.000.000-0"
                  />
                </div>

                <div>
                  <Label htmlFor="orgaoEmissor">Órgão Emissor</Label>
                  <Input
                    id="orgaoEmissor"
                    value={formData.orgaoEmissor || ''}
                    onChange={(e) => setFormData({ ...formData, orgaoEmissor: e.target.value })}
                    placeholder="SSP/UF"
                  />
                </div>

                <div>
                  <Label htmlFor="nacionalidade">Nacionalidade</Label>
                  <Input
                    id="nacionalidade"
                    value={formData.nacionalidade || 'Brasileiro(a)'}
                    onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="estadoCivil">Estado Civil</Label>
                  <Select
                    id="estadoCivil"
                    value={formData.estadoCivil || ''}
                    onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value as any })}
                  >
                    <option value="">Selecione</option>
                    <option value="SOLTEIRO">Solteiro(a)</option>
                    <option value="CASADO">Casado(a)</option>
                    <option value="DIVORCIADO">Divorciado(a)</option>
                    <option value="VIUVO">Viúvo(a)</option>
                    <option value="UNIAO_ESTAVEL">União Estável</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    value={formData.profissao || ''}
                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                    placeholder="Profissão"
                  />
                </div>

                <div>
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={formData.dataNascimento || ''}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos Pessoa Jurídica */}
          {!isPessoaFisica && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados da Empresa</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="razaoSocial">Razão Social *</Label>
                  <Input
                    id="razaoSocial"
                    value={formData.razaoSocial || ''}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value, nome: e.target.value })}
                    placeholder="Razão social da empresa"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input
                    id="nomeFantasia"
                    value={formData.nomeFantasia || ''}
                    onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                    placeholder="Nome fantasia"
                  />
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ {!isEdit && '*'}</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj || ''}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    required={!isEdit}
                    disabled={isEdit}
                  />
                </div>

                <div>
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricaoEstadual"
                    value={formData.inscricaoEstadual || ''}
                    onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                    placeholder="000.000.000.000"
                  />
                </div>

                <div>
                  <Label htmlFor="representanteLegal">Representante Legal</Label>
                  <Input
                    id="representanteLegal"
                    value={formData.representanteLegal || ''}
                    onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                    placeholder="Nome do representante"
                  />
                </div>

                <div>
                  <Label htmlFor="cargoRepresentante">Cargo do Representante</Label>
                  <Input
                    id="cargoRepresentante"
                    value={formData.cargoRepresentante || ''}
                    onChange={(e) => setFormData({ ...formData, cargoRepresentante: e.target.value })}
                    placeholder="Ex: Diretor, Sócio"
                  />
                </div>
              </div>
            </div>
          )}

          <hr className="my-6" />

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contato</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="email">E-mail {!isEdit && '*'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required={!isEdit}
                  disabled={isEdit}
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                  placeholder="(00) 0000-0000"
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={formData.celular || ''}
                  onChange={(e) => setFormData({ ...formData, celular: formatCelular(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>
          </div>

          <hr className="my-6" />

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Endereço</h3>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => formData.cep && buscarCep(formData.cep)}
                    disabled={loadingCep}
                  >
                    {loadingCep ? '...' : '🔍'}
                  </Button>
                </div>
              </div>

              <div className="col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.logradouro || ''}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  placeholder="Rua, Avenida, etc"
                />
              </div>

              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Nº"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento || ''}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Apto, Bloco, etc"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro || ''}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                />
              </div>

              <div className="col-span-3">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>

              <div>
                <Label htmlFor="uf">UF</Label>
                <Select
                  id="uf"
                  value={formData.uf || ''}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                >
                  <option value="">UF</option>
                  {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
