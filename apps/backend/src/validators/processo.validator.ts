import { body } from 'express-validator';

export const createProcessoValidator = [
  body('numero').notEmpty().withMessage('Número do processo é obrigatório'),
  body('clienteId').notEmpty().withMessage('Cliente é obrigatório'),

  // Campos opcionais
  body('tipoAcao').optional().isString(),
  body('areaDireito').optional().isString(),
  body('justica').optional().isIn(['ESTADUAL', 'FEDERAL', 'TRABALHO', 'ELEITORAL', 'MILITAR']),
  body('instancia').optional().isIn(['PRIMEIRA', 'SEGUNDA', 'SUPERIOR', 'SUPREMO']),
  body('comarca').optional().isString(),
  body('foro').optional().isString(),
  body('vara').optional().isString(),
  body('uf').optional().isString(),
  body('objetoAcao').optional().isString(),
  body('pedidoPrincipal').optional().isString(),
  body('valorCausa').optional().isNumeric(),
  body('valorHonorarios').optional().isNumeric(),
  body('dataDistribuicao').optional().isISO8601(),
  body('proximoPrazo').optional().isISO8601(),
  body('descricaoPrazo').optional().isString(),
  body('status').optional().isIn(['EM_ANDAMENTO', 'SUSPENSO', 'CONCLUIDO', 'ARQUIVADO']),
  body('prioridade').optional().isIn(['NORMAL', 'URGENTE', 'MUITO_URGENTE']),
  body('observacoes').optional().isString(),
  body('partes').optional().isArray(),
];

export const updateProcessoValidator = [
  body('tipoAcao').optional().isString(),
  body('areaDireito').optional().isString(),
  body('justica').optional().isIn(['ESTADUAL', 'FEDERAL', 'TRABALHO', 'ELEITORAL', 'MILITAR']),
  body('instancia').optional().isIn(['PRIMEIRA', 'SEGUNDA', 'SUPERIOR', 'SUPREMO']),
  body('comarca').optional().isString(),
  body('foro').optional().isString(),
  body('vara').optional().isString(),
  body('uf').optional().isString(),
  body('objetoAcao').optional().isString(),
  body('pedidoPrincipal').optional().isString(),
  body('valorCausa').optional().isNumeric(),
  body('valorHonorarios').optional().isNumeric(),
  body('dataDistribuicao').optional().isISO8601(),
  body('proximoPrazo').optional().isISO8601(),
  body('descricaoPrazo').optional().isString(),
  body('status').optional().isIn(['EM_ANDAMENTO', 'SUSPENSO', 'CONCLUIDO', 'ARQUIVADO']),
  body('prioridade').optional().isIn(['NORMAL', 'URGENTE', 'MUITO_URGENTE']),
  body('observacoes').optional().isString(),
];
