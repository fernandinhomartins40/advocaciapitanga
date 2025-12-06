# 📦 Sistema de Backup Automático - Advocacia Pitanga

Sistema completo de backup automatizado para o banco de dados PostgreSQL com suporte a armazenamento local e cloud.

## 🎯 Características

- ✅ **Backups automáticos diários** via cron job
- ✅ **Rotação automática** - mantém os 7 últimos backups
- ✅ **API REST completa** para gestão de backups
- ✅ **Validação de integridade** de cada backup criado
- ✅ **Upload opcional para cloud** (AWS S3, Google Cloud, Azure)
- ✅ **Restore de backups** via API ou linha de comando
- ✅ **Download de backups** via API
- ✅ **Estatísticas e monitoramento** em tempo real

## 📋 Índice

1. [Configuração](#-configuração)
2. [Funcionamento Automático](#-funcionamento-automático)
3. [API Endpoints](#-api-endpoints)
4. [Backup Manual](#-backup-manual)
5. [Restore de Backup](#-restore-de-backup)
6. [Cloud Storage (Opcional)](#%EF%B8%8F-cloud-storage-opcional)
7. [Troubleshooting](#-troubleshooting)

---

## ⚙️ Configuração

### Variáveis de Ambiente

Adicione estas variáveis ao seu arquivo `.env`:

```bash
# ============================================
# CONFIGURAÇÃO DE BACKUP
# ============================================

# Habilitar/desabilitar sistema de backup
BACKUP_ENABLED=true

# Diretório onde os backups serão salvos
BACKUP_DIR=/app/backups

# Número máximo de backups a manter (padrão: 7)
MAX_BACKUPS=7

# Expressão cron para agendamento (padrão: 3:00 AM todos os dias)
# Formato: minuto hora dia mês dia-da-semana
BACKUP_CRON_SCHEDULE=0 3 * * *

# Timezone para o agendamento
TZ=America/Sao_Paulo

# ============================================
# CLOUD BACKUP (OPCIONAL)
# ============================================

# Provider: aws-s3 | google-cloud | azure | none
CLOUD_BACKUP_PROVIDER=none

# Nome do bucket/container
CLOUD_BACKUP_BUCKET=advocacia-backups

# Região (para AWS)
CLOUD_BACKUP_REGION=us-east-1

# Credenciais AWS S3
AWS_ACCESS_KEY_ID=sua-chave-aqui
AWS_SECRET_ACCESS_KEY=sua-secret-aqui

# Credenciais Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Azure Storage Account (configurar via Azure CLI)
```

### Exemplos de Agendamento Cron

```bash
# Todos os dias às 3:00 AM (padrão)
BACKUP_CRON_SCHEDULE=0 3 * * *

# A cada 12 horas (3:00 AM e 3:00 PM)
BACKUP_CRON_SCHEDULE=0 3,15 * * *

# A cada 6 horas
BACKUP_CRON_SCHEDULE=0 */6 * * *

# Toda segunda-feira às 2:00 AM
BACKUP_CRON_SCHEDULE=0 2 * * 1

# Primeiro dia de cada mês às 1:00 AM
BACKUP_CRON_SCHEDULE=0 1 1 * *
```

---

## 🤖 Funcionamento Automático

### Inicialização

O sistema de backup é iniciado automaticamente quando o backend sobe:

```typescript
// Em apps/backend/src/server.ts
if (process.env.BACKUP_ENABLED !== 'false') {
  backupScheduler.start();
  logger.info('📦 Sistema de backup automático iniciado');
}
```

### Processo Automático

1. **Agendamento**: Cron job executa no horário configurado
2. **Criação**: Backup é criado via `pg_dump`
3. **Validação**: Sistema verifica integridade do backup
4. **Upload Cloud**: Se configurado, faz upload para cloud storage
5. **Limpeza**: Remove backups antigos (mantém os 7 mais recentes)
6. **Log**: Registra todas as operações e estatísticas

### Logs de Backup

Os backups automáticos geram logs detalhados:

```
═══════════════════════════════════════════════════════
🤖 Executando backup automático agendado...
⏰ Horário: 06/12/2025 03:00:00
═══════════════════════════════════════════════════════

🔄 Iniciando backup do banco de dados...
📁 Diretório de backup criado: /app/backups
✅ Backup criado com sucesso: backup_advocacia_pitanga_20251206_030000.sql (25.3 MB)
📊 Total de backups: 7/7
🗑️  Removendo 1 backup(s) antigo(s)...
   ✓ Removido: backup_advocacia_pitanga_20251129_030000.sql
✅ Limpeza concluída. Mantidos 7 backups mais recentes.

✅ BACKUP AUTOMÁTICO CONCLUÍDO COM SUCESSO!
📄 Arquivo: backup_advocacia_pitanga_20251206_030000.sql
📊 Tamanho: 25.3 MB
📅 Próximo backup: sexta-feira, 7 de dezembro de 2025 03:00

═══════════════════════════════════════════════════════

📊 ESTATÍSTICAS DE BACKUP:
   Total de backups: 7/7
   Espaço utilizado: 177.1 MB
```

---

## 🔌 API Endpoints

### Autenticação

Todos os endpoints requerem:
- **Autenticação**: Token JWT válido
- **Permissão**: Role `ADMIN_ESCRITORIO`

### 1. Listar Backups

```http
GET /api/backups
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "backup_advocacia_pitanga_20251206_030000.sql",
      "size": 26542080,
      "sizeFormatted": "25.3 MB",
      "createdAt": "2025-12-06T03:00:00.000Z",
      "isValid": true
    }
  ]
}
```

### 2. Criar Backup Manual

```http
POST /api/backups
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "message": "Backup criado com sucesso",
  "data": {
    "filename": "backup_advocacia_pitanga_20251206_150000.sql",
    "size": 26542080,
    "sizeFormatted": "25.3 MB",
    "createdAt": "2025-12-06T15:00:00.000Z",
    "isValid": true
  }
}
```

### 3. Obter Estatísticas

```http
GET /api/backups/stats
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalBackups": 7,
    "maxBackups": 7,
    "totalSize": "177.1 MB",
    "oldestBackup": "2025-11-30T03:00:00.000Z",
    "latestBackup": "2025-12-06T03:00:00.000Z",
    "backups": [...],
    "scheduler": {
      "isRunning": true,
      "cronExpression": "0 3 * * *",
      "timezone": "America/Sao_Paulo",
      "nextBackup": "sexta-feira, 7 de dezembro de 2025 03:00"
    }
  }
}
```

### 4. Informações de Backup Específico

```http
GET /api/backups/:filename
Authorization: Bearer <token>
```

**Exemplo:**
```http
GET /api/backups/backup_advocacia_pitanga_20251206_030000.sql
```

### 5. Download de Backup

```http
GET /api/backups/:filename/download
Authorization: Bearer <token>
```

**Exemplo:**
```http
GET /api/backups/backup_advocacia_pitanga_20251206_030000.sql/download
```

Retorna o arquivo SQL para download.

### 6. Restaurar Backup

```http
POST /api/backups/:filename/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirm": true
}
```

⚠️ **ATENÇÃO**: Esta operação irá **sobrescrever** o banco de dados atual!

**Resposta:**
```json
{
  "success": true,
  "message": "Backup restaurado com sucesso",
  "data": {
    "filename": "backup_advocacia_pitanga_20251206_030000.sql",
    "restoredAt": "2025-12-06T16:00:00.000Z"
  }
}
```

### 7. Deletar Backup

```http
DELETE /api/backups/:filename
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "message": "Backup deletado com sucesso",
  "data": {
    "filename": "backup_advocacia_pitanga_20251129_030000.sql",
    "deletedAt": "2025-12-06T16:00:00.000Z"
  }
}
```

### 8. Status do Scheduler

```http
GET /api/backups/scheduler/status
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "cronExpression": "0 3 * * *",
    "timezone": "America/Sao_Paulo",
    "nextBackup": "sexta-feira, 7 de dezembro de 2025 03:00"
  }
}
```

---

## 🔧 Backup Manual

### Via API

Use o endpoint `POST /api/backups` conforme documentado acima.

### Via Linha de Comando (Docker)

```bash
# Entrar no container
docker exec -it advocacia-app sh

# Criar backup manualmente
PGPASSWORD="postgres123" pg_dump \
  -h postgres \
  -p 5432 \
  -U postgres \
  -d advocacia_pitanga \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > /app/backups/backup_manual_$(date +%Y%m%d_%H%M%S).sql

# Verificar backups criados
ls -lh /app/backups/
```

---

## 🔄 Restore de Backup

### Via API

Use o endpoint `POST /api/backups/:filename/restore` conforme documentado acima.

### Via Linha de Comando (Docker)

```bash
# Entrar no container
docker exec -it advocacia-app sh

# Listar backups disponíveis
ls -lh /app/backups/

# Restaurar um backup específico
PGPASSWORD="postgres123" psql \
  -h postgres \
  -p 5432 \
  -U postgres \
  -d advocacia_pitanga \
  -f /app/backups/backup_advocacia_pitanga_20251206_030000.sql

# Verificar restauração
PGPASSWORD="postgres123" psql \
  -h postgres \
  -p 5432 \
  -U postgres \
  -d advocacia_pitanga \
  -c "SELECT COUNT(*) FROM \"User\";"
```

### ⚠️ Importante: Antes de Restaurar

1. **Faça um backup atual** antes de restaurar
2. **Verifique a integridade** do backup que será restaurado
3. **Pare aplicações** que estejam usando o banco
4. **Teste em ambiente de desenvolvimento** primeiro

---

## ☁️ Cloud Storage (Opcional)

### AWS S3

#### 1. Instalar AWS CLI (no Dockerfile)

```dockerfile
RUN apk add --no-cache aws-cli
```

#### 2. Configurar Variáveis

```bash
CLOUD_BACKUP_PROVIDER=aws-s3
CLOUD_BACKUP_BUCKET=advocacia-backups
CLOUD_BACKUP_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

#### 3. Criar Bucket S3

```bash
aws s3 mb s3://advocacia-backups --region us-east-1
```

### Google Cloud Storage

#### 1. Instalar Google Cloud SDK

```dockerfile
RUN apk add --no-cache python3 py3-pip && \
    pip3 install gsutil
```

#### 2. Configurar Variáveis

```bash
CLOUD_BACKUP_PROVIDER=google-cloud
CLOUD_BACKUP_BUCKET=advocacia-backups
GOOGLE_APPLICATION_CREDENTIALS=/app/config/gcloud-service-account.json
```

#### 3. Criar Service Account

1. Acesse Google Cloud Console
2. Crie um Service Account
3. Baixe o JSON de credenciais
4. Monte o arquivo no container

### Azure Blob Storage

#### 1. Instalar Azure CLI

```dockerfile
RUN apk add --no-cache azure-cli
```

#### 2. Configurar Variáveis

```bash
CLOUD_BACKUP_PROVIDER=azure
CLOUD_BACKUP_BUCKET=advocacia-backups
```

#### 3. Autenticar

```bash
az login
az storage container create --name advocacia-backups
```

### Upload Manual para Cloud

```bash
# AWS S3
aws s3 cp /app/backups/backup.sql s3://advocacia-backups/backups/

# Google Cloud
gsutil cp /app/backups/backup.sql gs://advocacia-backups/backups/

# Azure
az storage blob upload \
  --file /app/backups/backup.sql \
  --container-name advocacia-backups \
  --name backups/backup.sql
```

---

## 🐛 Troubleshooting

### Backup não está sendo criado

**Verificar se o scheduler está rodando:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/backups/scheduler/status
```

**Verificar logs do backend:**
```bash
docker logs advocacia-app | grep -i backup
```

**Verificar se pg_dump está disponível:**
```bash
docker exec -it advocacia-app sh
pg_dump --version
```

### Backup está corrompido

**Verificar integridade:**
```bash
# Verificar se contém SQL válido
head -n 50 /app/backups/backup.sql

# Verificar tamanho
ls -lh /app/backups/

# Testar restauração em banco temporário
createdb test_restore
psql -d test_restore -f /app/backups/backup.sql
dropdb test_restore
```

### Permissões negadas

**Verificar permissões do diretório:**
```bash
ls -la /app/ | grep backups
chown -R appuser:nodejs /app/backups
chmod -R 755 /app/backups
```

### Cloud upload está failhando

**Testar conexão:**
```bash
# AWS
aws s3 ls s3://advocacia-backups/

# Google Cloud
gsutil ls gs://advocacia-backups/

# Azure
az storage container show --name advocacia-backups
```

**Verificar credenciais:**
```bash
# AWS
aws sts get-caller-identity

# Google Cloud
gcloud auth list

# Azure
az account show
```

### Disco cheio

**Verificar espaço:**
```bash
df -h /app/backups/
```

**Limpar backups antigos manualmente:**
```bash
cd /app/backups/
ls -lt *.sql | tail -n +8 | awk '{print $9}' | xargs rm -f
```

**Reduzir número de backups mantidos:**
```bash
# Alterar MAX_BACKUPS no .env
MAX_BACKUPS=3
```

---

## 📊 Monitoramento

### Logs de Backup

Todos os backups geram logs detalhados que podem ser monitorados:

```bash
# Ver logs em tempo real
docker logs -f advocacia-app | grep -i backup

# Ver últimos backups
docker logs advocacia-app | grep "BACKUP AUTOMÁTICO CONCLUÍDO" | tail -n 10
```

### Alertas (Implementação Futura)

Você pode adicionar notificações em caso de falha:

```typescript
// Em backup-scheduler.service.ts
catch (error) {
  console.error('❌ ERRO AO EXECUTAR BACKUP:', error);

  // Enviar email
  // await emailService.sendBackupFailureAlert(error);

  // Slack
  // await slackService.sendMessage(`🚨 Backup falhou: ${error.message}`);

  // Telegram
  // await telegramService.sendAlert(error);
}
```

---

## 🔒 Segurança

### Recomendações

1. **Restringir acesso à API**: Apenas `ADMIN_ESCRITORIO`
2. **Criptografar backups**: Adicionar GPG encryption
3. **Backups off-site**: Sempre usar cloud storage em produção
4. **Testar restore regularmente**: Validar backups mensalmente
5. **Monitorar falhas**: Configurar alertas de erro
6. **Rotação de credenciais**: Atualizar chaves de cloud regularmente

### Criptografia de Backups (Opcional)

```bash
# Instalar GPG
apk add --no-cache gnupg

# Gerar chave
gpg --gen-key

# Criptografar backup
gpg --encrypt --recipient admin@pitanga.com backup.sql

# Descriptografar
gpg --decrypt backup.sql.gpg > backup.sql
```

---

## 📝 Changelog

### v1.0.0 (06/12/2025)

- ✅ Sistema de backup automático implementado
- ✅ API REST completa para gestão de backups
- ✅ Rotação automática (7 backups)
- ✅ Suporte para cloud storage (AWS/GCP/Azure)
- ✅ Validação de integridade
- ✅ Documentação completa

---

## 📧 Suporte

Em caso de problemas:

1. Consulte a seção [Troubleshooting](#-troubleshooting)
2. Verifique os logs do sistema
3. Teste a conexão com o banco de dados
4. Valide as configurações de ambiente

---

**Desenvolvido para Advocacia Pitanga** 🦊
Backup automático, seguro e confiável para seus dados jurídicos.
