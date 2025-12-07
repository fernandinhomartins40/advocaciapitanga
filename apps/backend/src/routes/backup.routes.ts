import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

/**
 * ROTAS DE BACKUP
 *
 * Todas as rotas requerem autenticação e permissão de ADMIN_ESCRITORIO
 * para garantir que apenas administradores possam gerenciar backups.
 */

// Middleware de autenticação e autorização
router.use(authMiddleware);
router.use(requireRole(['ADMIN_ESCRITORIO']));

/**
 * GET /api/backups/stats
 * Obtém estatísticas gerais de backup
 */
router.get('/stats', backupController.getStats.bind(backupController));

/**
 * GET /api/backups/scheduler/status
 * Obtém status do agendador de backups
 */
router.get('/scheduler/status', backupController.getSchedulerStatus.bind(backupController));

/**
 * GET /api/backups
 * Lista todos os backups disponíveis
 */
router.get('/', backupController.listBackups.bind(backupController));

/**
 * POST /api/backups
 * Cria um novo backup manualmente
 */
router.post('/', backupController.createBackup.bind(backupController));

/**
 * GET /api/backups/:filename
 * Obtém informações sobre um backup específico
 */
router.get('/:filename', backupController.getBackupInfo.bind(backupController));

/**
 * GET /api/backups/:filename/download
 * Faz download de um backup específico
 */
router.get('/:filename/download', backupController.downloadBackup.bind(backupController));

/**
 * POST /api/backups/:filename/restore
 * Restaura um backup específico
 *
 * ⚠️ ATENÇÃO: Esta operação sobrescreverá o banco de dados atual!
 * Requer confirmação no corpo da requisição: { "confirm": true }
 */
router.post('/:filename/restore', backupController.restoreBackup.bind(backupController));

/**
 * DELETE /api/backups/:filename
 * Deleta um backup específico
 */
router.delete('/:filename', backupController.deleteBackup.bind(backupController));

export default router;
