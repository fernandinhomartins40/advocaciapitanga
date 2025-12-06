# 🚀 Quick Start - Sistema de Backup

Guia rápido para começar a usar o sistema de backup automático.

## ⚡ Configuração Rápida (5 minutos)

### 1. Instalar Dependências

```bash
cd apps/backend
npm install
```

As dependências necessárias já foram adicionadas:
- `node-cron@^3.0.3` - Agendamento de tarefas
- `date-fns@^3.0.0` - Formatação de datas
- `@types/node-cron@^3.0.11` - TypeScript types

### 2. Configurar Variáveis de Ambiente

Copie as configurações de backup para seu `.env`:

```bash
# Backup automático habilitado
BACKUP_ENABLED=true

# Diretório de backups
BACKUP_DIR=/app/backups

# Manter últimos 7 backups
MAX_BACKUPS=7

# Backup diário às 3:00 AM
BACKUP_CRON_SCHEDULE=0 3 * * *

# Timezone
TZ=America/Sao_Paulo
```

### 3. Build e Deploy

```bash
# Desenvolvimento
npm run dev

# Produção (Docker)
docker-compose -f docker-compose.vps.yml up -d --build
```

## ✅ Verificar se está Funcionando

### Via API

```bash
# Obter status do scheduler
curl -X GET http://localhost:3001/api/backups/scheduler/status \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
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

### Via Logs

```bash
# Ver logs do backend
docker logs advocacia-app | grep backup

# Você deve ver:
# 📦 Sistema de backup automático iniciado
# ⏰ Iniciando scheduler de backup com expressão: 0 3 * * *
# ✅ Scheduler de backup iniciado com sucesso!
```

## 🔧 Criar Primeiro Backup

### Via API (Recomendado)

```bash
curl -X POST http://localhost:3001/api/backups \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

### Via CLI

```bash
# Entrar no container
docker exec -it advocacia-app sh

# Listar backups
ls -lh /app/backups/

# Criar backup manual
PGPASSWORD="postgres123" pg_dump \
  -h postgres -U postgres -d advocacia_pitanga \
  > /app/backups/backup_manual_$(date +%Y%m%d_%H%M%S).sql
```

## 📊 Monitorar Backups

### Listar Backups

```bash
curl -X GET http://localhost:3001/api/backups \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Ver Estatísticas

```bash
curl -X GET http://localhost:3001/api/backups/stats \
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta:
```json
{
  "success": true,
  "data": {
    "totalBackups": 7,
    "maxBackups": 7,
    "totalSize": "177.1 MB",
    "oldestBackup": "2025-11-30T03:00:00.000Z",
    "latestBackup": "2025-12-06T03:00:00.000Z",
    "scheduler": {
      "isRunning": true,
      "nextBackup": "sexta-feira, 7 de dezembro de 2025 03:00"
    }
  }
}
```

## 🔄 Testar Restore

### ⚠️ IMPORTANTE: Teste em Desenvolvimento Primeiro!

```bash
# Via API
curl -X POST http://localhost:3001/api/backups/NOME_DO_ARQUIVO/restore \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'

# Via CLI
docker exec -it advocacia-app sh
PGPASSWORD="postgres123" psql \
  -h postgres -U postgres -d advocacia_pitanga \
  -f /app/backups/backup_advocacia_pitanga_20251206_030000.sql
```

## ☁️ Configurar Cloud Storage (Opcional)

### AWS S3

```bash
# 1. Criar bucket
aws s3 mb s3://advocacia-backups --region us-east-1

# 2. Configurar no .env
CLOUD_BACKUP_PROVIDER=aws-s3
CLOUD_BACKUP_BUCKET=advocacia-backups
AWS_ACCESS_KEY_ID=sua-chave
AWS_SECRET_ACCESS_KEY=sua-secret

# 3. Rebuild container
docker-compose -f docker-compose.vps.yml up -d --build
```

Os backups serão automaticamente enviados para S3 após cada backup local.

## 📋 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/backups` | Listar backups |
| POST | `/api/backups` | Criar backup manual |
| GET | `/api/backups/stats` | Ver estatísticas |
| GET | `/api/backups/scheduler/status` | Status do scheduler |
| GET | `/api/backups/:filename` | Info de backup específico |
| GET | `/api/backups/:filename/download` | Download de backup |
| POST | `/api/backups/:filename/restore` | Restaurar backup |
| DELETE | `/api/backups/:filename` | Deletar backup |

## 🛠️ Troubleshooting Rápido

### Backup não está sendo criado

```bash
# 1. Verificar se está habilitado
echo $BACKUP_ENABLED

# 2. Verificar logs
docker logs advocacia-app | grep -i "backup\|error"

# 3. Verificar permissões
docker exec -it advocacia-app sh
ls -la /app/backups/
```

### Erro de permissão

```bash
docker exec -it advocacia-app sh
chown -R appuser:nodejs /app/backups
chmod -R 755 /app/backups
```

### pg_dump não encontrado

O Dockerfile.vps já foi atualizado com `postgresql-client`. Se ainda assim houver erro:

```bash
docker exec -it advocacia-app sh
apk add --no-cache postgresql-client
```

## 📚 Documentação Completa

Para mais detalhes, consulte:
- **[BACKUP.md](BACKUP.md)** - Documentação completa
- **[.env.backup.example](.env.backup.example)** - Exemplos de configuração

## 🎯 Checklist de Implantação

- [ ] Dependências instaladas (`node-cron`, `date-fns`)
- [ ] Variáveis de ambiente configuradas
- [ ] Dockerfile atualizado com `postgresql-client`
- [ ] Container rodando com permissões corretas
- [ ] Scheduler iniciado (ver logs)
- [ ] Primeiro backup criado com sucesso
- [ ] Backup testado via restore
- [ ] Cloud storage configurado (opcional)
- [ ] Monitoramento configurado

## 🔐 Segurança

**Acesso à API:**
- ✅ Autenticação obrigatória (JWT)
- ✅ Apenas `ADMIN_ESCRITORIO` pode acessar
- ✅ Confirmação necessária para restore

**Dados:**
- ✅ Backups validados automaticamente
- ✅ Rotação automática (7 backups)
- ✅ Upload opcional para cloud

## 📞 Suporte

Problemas? Consulte:
1. Logs: `docker logs advocacia-app | grep backup`
2. Status: `GET /api/backups/scheduler/status`
3. Documentação: [BACKUP.md](BACKUP.md)

---

**Sistema de Backup v1.0** - Advocacia Pitanga 🦊
