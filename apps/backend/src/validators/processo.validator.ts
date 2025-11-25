import { body } from 'express-validator';

export const createProcessoValidator = [
  body('numero').notEmpty().withMessage('Número do processo é obrigatório'),
  body('clienteId').notEmpty().withMessage('Cliente é obrigatório'),
  body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  body('status').optional().isIn(['EM_ANDAMENTO', 'SUSPENSO', 'CONCLUIDO', 'ARQUIVADO']),
];

export const updateProcessoValidator = [
  body('descricao').optional().notEmpty(),
  body('status').optional().isIn(['EM_ANDAMENTO', 'SUSPENSO', 'CONCLUIDO', 'ARQUIVADO']),
];
