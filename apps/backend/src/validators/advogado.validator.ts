import { body } from 'express-validator';

// Validador para atualização de perfil
export const updateProfileValidator = [
  body('nome')
    .optional()
    .isString()
    .withMessage('Nome deve ser uma string')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Nome deve ter no mínimo 3 caracteres'),

  body('oab')
    .optional()
    .isString()
    .withMessage('OAB deve ser uma string')
    .trim()
    .matches(/^[A-Z]{2}\d{4,8}$/)
    .withMessage('OAB deve estar no formato: UF seguido de 4 a 8 dígitos (ex: SP123456)'),

  body('telefone')
    .optional()
    .isString()
    .withMessage('Telefone deve ser uma string')
    .trim()
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage('Telefone deve estar no formato: (99) 99999-9999'),
];

// Validador para alteração de email
export const updateEmailValidator = [
  body('email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .trim(),

  body('senhaAtual')
    .notEmpty()
    .withMessage('Senha atual é obrigatória')
    .isString()
    .withMessage('Senha atual deve ser uma string'),
];

// Validador para alteração de senha
export const updatePasswordValidator = [
  body('senhaAtual')
    .notEmpty()
    .withMessage('Senha atual é obrigatória')
    .isString()
    .withMessage('Senha atual deve ser uma string'),

  body('novaSenha')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .isString()
    .withMessage('Nova senha deve ser uma string')
    .isLength({ min: 8 })
    .withMessage('Nova senha deve ter no mínimo 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Nova senha deve conter pelo menos uma letra maiúscula')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Nova senha deve conter pelo menos um caractere especial'),
];
