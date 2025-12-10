import { body } from 'express-validator';

export const createProcessoValidator = [
  body('numero').notEmpty().withMessage('Número do processo é obrigatório'),
  body('clienteId').notEmpty().withMessage('Cliente é obrigatório'),
  body('advogadoId').notEmpty().withMessage('Advogado responsável é obrigatório'),

  // Campos opcionais - aceitar valores vazios e null
  body('tipoAcao').optional({ values: 'null' }).isString(),
  body('areaDireito').optional({ values: 'null' }).isString(),
  body('justica').optional({ values: 'null' }).custom((value) => {
    if (!value || value === '') return true;
    return ['ESTADUAL', 'FEDERAL', 'TRABALHO', 'ELEITORAL', 'MILITAR'].includes(value);
  }),
  body('instancia').optional({ values: 'null' }).custom((value) => {
    if (!value || value === '') return true;
    return ['PRIMEIRA', 'SEGUNDA', 'SUPERIOR', 'SUPREMO'].includes(value);
  }),
  body('comarca').optional({ values: 'null' }).isString(),
  body('foro').optional({ values: 'null' }).isString(),
  body('vara').optional({ values: 'null' }).isString(),
  body('uf').optional({ values: 'null' }).isString(),
  body('objetoAcao').optional({ values: 'null' }).isString(),
  body('pedidoPrincipal').optional({ values: 'null' }).isString(),
  body('valorCausa').optional({ values: 'null' }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(Number(value));
  }),
  body('valorHonorarios').optional({ values: 'null' }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(Number(value));
  }),
  body('dataDistribuicao').optional({ values: 'null' }).custom((value) => {
    if (!value || value === '') return true;
    return !isNaN(Date.parse(value));
  }),
  body('proximoPrazo').optional({ values: 'null' }).custom((value) => {
    if (!value || value === '') return true;
    return !isNaN(Date.parse(value));
  }),
  body('descricaoPrazo').optional({ values: 'null' }).isString(),
  body('status').optional({ values: 'null' }).custom((value) => {
    if (!value || value === '') return true;
    return ['EM_ANDAMENTO', 'SUSPENSO', 'CONCLUIDO', 'ARQUIVADO'].includes(value);
  }),
  body('prioridade').optional({ values: 'null' }).custom((value) => {
    if (!value || value === '') return true;
    return ['NORMAL', 'URGENTE', 'MUITO_URGENTE'].includes(value);
  }),
  body('observacoes').optional({ values: 'null' }).isString(),
  body('partes').optional({ values: 'null' }).isArray(),
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
