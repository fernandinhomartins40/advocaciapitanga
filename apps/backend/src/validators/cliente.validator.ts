import { body } from 'express-validator';

export const createClienteValidator = [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),

  // Tipo de pessoa
  body('tipoPessoa').optional().isIn(['FISICA', 'JURIDICA']).withMessage('Tipo de pessoa inválido'),

  // Pessoa Física
  body('cpf').optional(),
  body('rg').optional(),
  body('orgaoEmissor').optional(),
  body('nacionalidade').optional(),
  body('estadoCivil').optional().isIn(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL']),
  body('profissao').optional(),
  body('dataNascimento').optional().isISO8601().withMessage('Data de nascimento inválida'),

  // Pessoa Jurídica
  body('cnpj').optional(),
  body('razaoSocial').optional(),
  body('nomeFantasia').optional(),
  body('inscricaoEstadual').optional(),
  body('representanteLegal').optional(),
  body('cargoRepresentante').optional(),

  // Contato
  body('telefone').optional(),
  body('celular').optional(),

  // Endereço
  body('cep').optional(),
  body('logradouro').optional(),
  body('numero').optional(),
  body('complemento').optional(),
  body('bairro').optional(),
  body('cidade').optional(),
  body('uf').optional(),
];

export const updateClienteValidator = [
  body('nome').optional().notEmpty().withMessage('Nome não pode ser vazio'),

  // Pessoa Física
  body('rg').optional(),
  body('orgaoEmissor').optional(),
  body('nacionalidade').optional(),
  body('estadoCivil').optional().isIn(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL']),
  body('profissao').optional(),
  body('dataNascimento').optional().isISO8601().withMessage('Data de nascimento inválida'),

  // Pessoa Jurídica
  body('razaoSocial').optional(),
  body('nomeFantasia').optional(),
  body('inscricaoEstadual').optional(),
  body('representanteLegal').optional(),
  body('cargoRepresentante').optional(),

  // Contato
  body('telefone').optional(),
  body('celular').optional(),

  // Endereço
  body('cep').optional(),
  body('logradouro').optional(),
  body('numero').optional(),
  body('complemento').optional(),
  body('bairro').optional(),
  body('cidade').optional(),
  body('uf').optional(),
];
