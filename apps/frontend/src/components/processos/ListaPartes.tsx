'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ParteProcessualData } from './ModalParteProcessual';
import { User, Building2, Edit, Trash2 } from 'lucide-react';

interface ListaPartesProps {
  partes: ParteProcessualData[];
  onEdit: (parte: ParteProcessualData, index: number) => void;
  onRemove: (index: number) => void;
}

const TIPO_PARTE_LABELS = {
  AUTOR: 'Autor(a)',
  REU: 'Réu/Requerido(a)',
  TERCEIRO_INTERESSADO: 'Terceiro Interessado',
  ASSISTENTE: 'Assistente',
  DENUNCIADO_LIDE: 'Denunciado à Lide',
  CHAMADO_PROCESSO: 'Chamado ao Processo',
};

const ESTADO_CIVIL_LABELS = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
  UNIAO_ESTAVEL: 'União Estável',
};

export function ListaPartes({ partes, onEdit, onRemove }: ListaPartesProps) {
  if (partes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <p>Nenhuma parte adicionada ainda</p>
          <p className="text-sm mt-2">Clique em "Adicionar Parte" para começar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {partes.map((parte, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex">
              {/* Barra lateral colorida por tipo */}
              <div
                className={`w-2 ${
                  parte.tipoParte === 'AUTOR'
                    ? 'bg-blue-500'
                    : parte.tipoParte === 'REU'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />

              {/* Conteúdo */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Ícone */}
                    <div
                      className={`p-3 rounded-lg ${
                        parte.tipoPessoa === 'FISICA' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}
                    >
                      {parte.tipoPessoa === 'FISICA' ? (
                        <User className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Building2 className="h-6 w-6 text-purple-600" />
                      )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1">
                      {/* Nome e tipo */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {parte.tipoPessoa === 'FISICA'
                            ? parte.nomeCompleto
                            : parte.razaoSocial || parte.nomeCompleto}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {parte.tipoPessoa === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </span>
                      </div>

                      {/* Tipo de parte */}
                      <p className="text-sm font-medium text-gray-600 mb-3">
                        {TIPO_PARTE_LABELS[parte.tipoParte]}
                      </p>

                      {/* Grid de informações */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        {/* Pessoa Física */}
                        {parte.tipoPessoa === 'FISICA' && (
                          <>
                            {parte.cpf && (
                              <div>
                                <span className="text-gray-500">CPF:</span>{' '}
                                <span className="font-medium">{parte.cpf}</span>
                              </div>
                            )}
                            {parte.rg && (
                              <div>
                                <span className="text-gray-500">RG:</span>{' '}
                                <span className="font-medium">
                                  {parte.rg}
                                  {parte.orgaoEmissor && ` - ${parte.orgaoEmissor}`}
                                </span>
                              </div>
                            )}
                            {parte.estadoCivil && (
                              <div>
                                <span className="text-gray-500">Estado Civil:</span>{' '}
                                <span className="font-medium">
                                  {ESTADO_CIVIL_LABELS[parte.estadoCivil]}
                                </span>
                              </div>
                            )}
                            {parte.profissao && (
                              <div>
                                <span className="text-gray-500">Profissão:</span>{' '}
                                <span className="font-medium">{parte.profissao}</span>
                              </div>
                            )}
                            {parte.nacionalidade && (
                              <div>
                                <span className="text-gray-500">Nacionalidade:</span>{' '}
                                <span className="font-medium">{parte.nacionalidade}</span>
                              </div>
                            )}
                            {parte.dataNascimento && (
                              <div>
                                <span className="text-gray-500">Data Nasc.:</span>{' '}
                                <span className="font-medium">
                                  {new Date(parte.dataNascimento).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Pessoa Jurídica */}
                        {parte.tipoPessoa === 'JURIDICA' && (
                          <>
                            {parte.nomeFantasia && (
                              <div>
                                <span className="text-gray-500">Nome Fantasia:</span>{' '}
                                <span className="font-medium">{parte.nomeFantasia}</span>
                              </div>
                            )}
                            {parte.cnpj && (
                              <div>
                                <span className="text-gray-500">CNPJ:</span>{' '}
                                <span className="font-medium">{parte.cnpj}</span>
                              </div>
                            )}
                            {parte.inscricaoEstadual && (
                              <div>
                                <span className="text-gray-500">Insc. Estadual:</span>{' '}
                                <span className="font-medium">{parte.inscricaoEstadual}</span>
                              </div>
                            )}
                            {parte.representanteLegal && (
                              <div>
                                <span className="text-gray-500">Representante:</span>{' '}
                                <span className="font-medium">
                                  {parte.representanteLegal}
                                  {parte.cargoRepresentante && ` (${parte.cargoRepresentante})`}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Contato */}
                        {parte.email && (
                          <div>
                            <span className="text-gray-500">E-mail:</span>{' '}
                            <span className="font-medium">{parte.email}</span>
                          </div>
                        )}
                        {parte.telefone && (
                          <div>
                            <span className="text-gray-500">Telefone:</span>{' '}
                            <span className="font-medium">{parte.telefone}</span>
                          </div>
                        )}
                        {parte.celular && (
                          <div>
                            <span className="text-gray-500">Celular:</span>{' '}
                            <span className="font-medium">{parte.celular}</span>
                          </div>
                        )}

                        {/* Endereço */}
                        {(parte.logradouro || parte.cidade) && (
                          <div className="col-span-full">
                            <span className="text-gray-500">Endereço:</span>{' '}
                            <span className="font-medium">
                              {parte.logradouro}
                              {parte.numero && `, ${parte.numero}`}
                              {parte.complemento && ` - ${parte.complemento}`}
                              {parte.bairro && ` - ${parte.bairro}`}
                              {parte.cidade && ` - ${parte.cidade}`}
                              {parte.uf && `/${parte.uf}`}
                              {parte.cep && ` - CEP: ${parte.cep}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(parte, index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRemove(index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
