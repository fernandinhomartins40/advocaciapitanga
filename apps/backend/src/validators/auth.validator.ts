import { body } from 'express-validator';

// Validador customizado para senha forte
const passwordValidator = body('password')
  .isLength({ min: 8 })
  .withMessage('Senha deve ter no mínimo 8 caracteres')
  .matches(/[A-Z]/)
  .withMessage('Senha deve conter pelo menos uma letra maiúscula')
  .matches(/[!@#$%^&*(),.?":{}|<>]/)
  .withMessage('Senha deve conter pelo menos um caractere especial');

export const registerValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  passwordValidator,
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('role').isIn(['ADVOGADO', 'CLIENTE']).withMessage('Role inválido'),
  body('cpf').if(body('role').equals('CLIENTE')).notEmpty().withMessage('CPF é obrigatório para clientes'),
  body('oab').if(body('role').equals('ADVOGADO')).notEmpty().withMessage('OAB é obrigatório para advogados'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória'),
];
