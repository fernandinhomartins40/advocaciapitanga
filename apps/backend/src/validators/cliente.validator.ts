import { body } from 'express-validator';

export const createClienteValidator = [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('cpf').notEmpty().withMessage('CPF é obrigatório'),
  body('telefone').optional(),
  body('endereco').optional(),
];

export const updateClienteValidator = [
  body('nome').optional().notEmpty().withMessage('Nome não pode ser vazio'),
  body('telefone').optional(),
  body('endereco').optional(),
];
