import cron from 'node-cron';
import { backupService } from './backup.service';
import { backupCloudService } from './backup-cloud.service';

export class BackupSchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Inicia o agendamento de backups automáticos
   * Por padrão, executa todos os dias às 3:00 AM
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Scheduler de backup já está em execução');
      return;
    }

    // Lê a configuração do cron da variável de ambiente ou usa o padrão
    // Formato: minuto hora dia mês dia-da-semana
    // Padrão: '0 3 * * *' = Todos os dias às 3:00 AM
    const cronExpression = process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';

    console.log(`⏰ Iniciando scheduler de backup com expressão: ${cronExpression}`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.executeScheduledBackup();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'America/Sao_Paulo',
    });

    this.isRunning = true;
    console.log('✅ Scheduler de backup iniciado com sucesso!');
    console.log(`📅 Próximo backup agendado para: ${this.getNextBackupTime()}`);
  }

  /**
   * Para o agendamento de backups
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('🛑 Scheduler de backup parado');
    }
  }

  /**
   * Executa o backup agendado
   */
  private async executeScheduledBackup(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🤖 Executando backup automático agendado...');
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═══════════════════════════════════════════════════════\n');

    try {
      const backupInfo = await backupService.createBackup();

      console.log('\n✅ BACKUP AUTOMÁTICO CONCLUÍDO COM SUCESSO!');
      console.log(`📄 Arquivo: ${backupInfo.filename}`);
      console.log(`📊 Tamanho: ${this.formatBytes(backupInfo.size)}`);
      console.log(`📅 Próximo backup: ${this.getNextBackupTime()}\n`);

      // Upload para cloud (se configurado)
      const cloudConfig = backupCloudService.getConfig();
      if (cloudConfig.enabled) {
        try {
          console.log(`☁️  Iniciando upload para ${cloudConfig.provider}...`);
          await backupCloudService.uploadBackup(backupInfo.path);
          await backupCloudService.cleanOldCloudBackups(7); // Mantém 7 backups no cloud também
          console.log('✅ Upload para cloud concluído!\n');
        } catch (cloudError) {
          console.error('⚠️  Erro ao fazer upload para cloud:', cloudError);
          console.log('   (Backup local foi salvo com sucesso)\n');
        }
      }

      console.log('═══════════════════════════════════════════════════════\n');

      // Exibe estatísticas
      const stats = await backupService.getBackupStats();
      console.log('📊 ESTATÍSTICAS DE BACKUP:');
      console.log(`   Total de backups: ${stats.totalBackups}/${stats.maxBackups}`);
      console.log(`   Espaço utilizado: ${stats.totalSize}`);
      console.log('');
    } catch (error) {
      console.error('\n❌ ERRO AO EXECUTAR BACKUP AUTOMÁTICO:');
      console.error(error);
      console.log('═══════════════════════════════════════════════════════\n');

      // Aqui você pode adicionar notificação por email, Slack, etc.
      // Exemplo: await notificationService.sendBackupFailureAlert(error);
    }
  }

  /**
   * Executa um backup manual imediatamente
   */
  async executeManualBackup(): Promise<void> {
    console.log('🔧 Executando backup manual...');
    await this.executeScheduledBackup();
  }

  /**
   * Verifica se o scheduler está rodando
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Obtém a data/hora do próximo backup agendado
   */
  getNextBackupTime(): string {
    if (!this.cronJob) {
      return 'Scheduler não está rodando';
    }

    // Calcula o próximo horário baseado na expressão cron
    const cronExpression = process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *';
    const parts = cronExpression.split(' ');

    if (parts.length !== 5) {
      return 'Expressão cron inválida';
    }

    const [minute, hour] = parts;
    const now = new Date();
    let nextRun = new Date();

    nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // Se o horário já passou hoje, agenda para amanhã
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.toLocaleString('pt-BR', {
      timeZone: process.env.TZ || 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }

  /**
   * Formata bytes em formato legível
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtém status do scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *',
      timezone: process.env.TZ || 'America/Sao_Paulo',
      nextBackup: this.getNextBackupTime(),
    };
  }
}

export const backupScheduler = new BackupSchedulerService();
