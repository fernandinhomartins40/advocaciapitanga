# 🛡️ Guia de Deploy Seguro - Advocacia Pitanga

## 📋 Resumo das Proteções Implementadas

Este documento descreve as proteções implementadas para **garantir que os dados não sejam perdidos durante deploys**.

---

## ✅ Proteções Implementadas

### 1. **Volumes Persistentes Docker**
- ✅ Volume `postgres_data` para banco de dados PostgreSQL
- ✅ Volume `uploads_data` para arquivos enviados
- ✅ Configurados no [docker-compose.vps.yml](docker-compose.vps.yml)

### 2. **Backup Automático Antes de Deploy**
- ✅ Backup criado ANTES de qualquer migration
- ✅ Backups salvos em `/root/advocaciapitanga/backups/`
- ✅ Retenção automática dos últimos 7 dias
- ✅ Link simbólico para último backup: `backups/latest.sql`
- 🆕 **Validação de integridade do backup** (Versão 3.0)
- 🆕 **Backup remoto/offsite** para múltiplos destinos (Versão 3.0)

### 3. **Migrations Versionadas (NÃO db push)**
- ✅ Uso obrigatório de `prisma migrate deploy`
- ❌ **REMOVIDO**: `prisma db push --accept-data-loss`
- ✅ Deploy falha se não houver migrations

### 4. **Validações de Segurança**
- ✅ Verificação de volumes ANTES e DEPOIS de cada operação
- ✅ Proteção contra `docker-compose down -v`
- ✅ Proteção contra `docker volume prune`
- ✅ Rollback automático em caso de falha nas migrations
- 🆕 **Validação de integridade SQL** (Versão 3.0)
- 🆕 **Verificação de tamanho mínimo** (Versão 3.0)

### 5. **Limpeza Segura**
- ✅ Remove apenas containers e imagens
- ❌ NUNCA remove volumes
- ✅ Validação antes/depois da limpeza

### 6. 🆕 **Sistema de Notificações (Versão 3.0)**
- ✅ Notificações em múltiplos canais (Slack, Discord, Telegram, Email, Teams, PagerDuty)
- ✅ Alertas automáticos em caso de falha
- ✅ Confirmação de deploy bem-sucedido
- ✅ Alertas críticos para erros no rollback

### 7. 🆕 **Backup Remoto/Offsite (Versão 3.0)**
- ✅ Suporte para AWS S3
- ✅ Suporte para servidores remotos (SSH/SCP)
- ✅ Suporte para Google Cloud Storage
- ✅ Suporte para Dropbox
- ✅ Limpeza automática de backups antigos (>30 dias)

---

## 🚀 Como Fazer Deploy Seguro

### **Opção 1: Deploy Automático (GitHub Actions)**

Simplesmente faça push para a branch `main`:

```bash
git add .
git commit -m "feat: sua mensagem"
git push origin main
```

O workflow automático irá:
1. ✅ Verificar volumes existentes
2. ✅ Criar backup automático
3. ✅ Executar migrations versionadas
4. ✅ Validar integridade dos dados
5. ✅ Rollback automático em caso de erro

### **Opção 2: Deploy Manual**

Execute o script seguro:

```bash
cd /root/advocaciapitanga
bash scripts/deploy-manual.sh
```

---

## 📦 Gerenciamento de Migrations

### **Criar Nova Migration**

Quando você alterar o [schema.prisma](packages/database/prisma/schema.prisma):

```bash
# Localmente
cd packages/database
npx prisma migrate dev --name nome_descritivo

# Commitar migrations
git add prisma/migrations
git commit -m "feat: add migration nome_descritivo"
git push
```

### **Aplicar Migrations em Produção**

Migrations são aplicadas **automaticamente** durante o deploy.

Se precisar aplicar manualmente:

```bash
docker exec advocacia-vps sh -c "cd /app && npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma"
```

---

## 🆕 Novas Funcionalidades (Versão 3.0)

### **🔍 Validação de Integridade de Backup**

Todos os backups agora são validados automaticamente:

```bash
# O que é verificado:
✅ Presença de comandos SQL válidos (CREATE TABLE, INSERT, COPY)
✅ Marcador de conclusão do PostgreSQL
✅ Tamanho mínimo adequado (>1KB)
✅ Estrutura completa do arquivo
```

Se o backup estiver corrompido, o deploy é **ABORTADO** antes de qualquer alteração.

### **📤 Backup Remoto/Offsite**

Envie backups automaticamente para locais remotos seguros:

#### **Configurar AWS S3:**
```bash
# Na VPS, adicione ao .env ou como variáveis de ambiente
export AWS_ACCESS_KEY_ID="sua-chave-aqui"
export AWS_SECRET_ACCESS_KEY="seu-secret-aqui"
export AWS_S3_BUCKET="advocacia-pitanga-backups"
```

#### **Configurar Servidor Remoto (SSH):**
```bash
export REMOTE_BACKUP_HOST="backup-server.com"
export REMOTE_BACKUP_PATH="/backups/advocacia"
export REMOTE_BACKUP_USER="root"
export REMOTE_BACKUP_KEY="/path/to/ssh-key"  # ou REMOTE_BACKUP_PASSWORD
```

#### **Configurar Google Cloud Storage:**
```bash
export GCS_BUCKET="advocacia-pitanga-backups"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

#### **Configurar Dropbox:**
```bash
export DROPBOX_ACCESS_TOKEN="seu-token-aqui"
```

#### **Executar Backup Remoto Manualmente:**
```bash
cd /root/advocaciapitanga
bash scripts/backup-remote.sh backups/latest.sql
```

### **🔔 Sistema de Notificações**

Receba alertas automáticos sobre deploys:

#### **Configurar Slack:**
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

#### **Configurar Discord:**
```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK"
```

#### **Configurar Telegram:**
```bash
export TELEGRAM_BOT_TOKEN="seu-bot-token"
export TELEGRAM_CHAT_ID="seu-chat-id"
```

#### **Configurar Email (SMTP):**
```bash
export SMTP_SERVER="smtp.gmail.com:587"
export SMTP_FROM="noreply@advocaciapitanga.com.br"
export SMTP_TO="admin@advocaciapitanga.com.br"
export SMTP_USER="seu-email@gmail.com"
export SMTP_PASSWORD="sua-app-password"
```

#### **Configurar Microsoft Teams:**
```bash
export TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/YOUR/WEBHOOK/URL"
```

#### **Configurar PagerDuty (apenas erros críticos):**
```bash
export PAGERDUTY_INTEGRATION_KEY="sua-integration-key"
```

#### **Tipos de Notificações:**

✅ **Sucesso**: Deploy concluído sem problemas
⚠️ **Aviso**: Rollback executado com sucesso
🔴 **Erro**: Falha crítica requer intervenção manual

#### **Testar Notificações:**
```bash
# Teste de notificação de sucesso
bash scripts/notify.sh "Teste de Notificação" "Sistema funcionando corretamente" "success"

# Teste de notificação de erro
bash scripts/notify.sh "Teste de Alerta" "Simulação de erro crítico" "error"
```

---

## 🔄 Backup e Restore

### **Criar Backup Manual**

```bash
cd /root/advocaciapitanga
bash scripts/backup-database.sh
```

Backups são salvos em:
- `/root/advocaciapitanga/backups/postgres_backup_TIMESTAMP.sql`
- `/root/advocaciapitanga/backups/latest.sql` (link para o mais recente)

### **Restaurar Backup**

```bash
cd /root/advocaciapitanga
bash scripts/restore-database.sh backups/latest.sql
```

⚠️ **ATENÇÃO**: Restore substitui TODOS os dados atuais!

### **Listar Backups Disponíveis**

```bash
ls -lh /root/advocaciapitanga/backups/
```

---

## 🔍 Verificação de Integridade

### **Verificar Volumes**

```bash
docker volume ls | grep -E "postgres_data|uploads_data"
```

### **Verificar Dados no Banco**

```bash
# Contar tabelas
docker exec advocacia-postgres psql -U advocacia -d advocacia_pitanga -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Contar usuários
docker exec advocacia-postgres psql -U advocacia -d advocacia_pitanga -c "SELECT COUNT(*) FROM \"User\";"

# Listar usuários
docker exec advocacia-postgres psql -U advocacia -d advocacia_pitanga -c "SELECT email, role, nome FROM \"User\";"
```

### **Verificar Status dos Containers**

```bash
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml ps
```

---

## ⚠️ COMANDOS PERIGOSOS - NUNCA USE

### ❌ **NUNCA Execute Estes Comandos em Produção:**

```bash
# PERIGO: Remove volumes junto com containers
docker-compose down -v

# PERIGO: Remove todos os volumes não utilizados
docker volume prune

# PERIGO: Aceita perda de dados
prisma db push --accept-data-loss

# PERIGO: Reseta o banco (REMOVE TODOS OS DADOS)
prisma migrate reset
```

---

## 🆘 Solução de Problemas

### **Deploy Falhou - Como Reverter?**

1. Verificar logs:
```bash
docker logs advocacia-vps --tail=100
docker logs advocacia-postgres --tail=50
```

2. Restaurar último backup:
```bash
cd /root/advocaciapitanga
bash scripts/restore-database.sh backups/latest.sql
```

3. Reiniciar containers:
```bash
docker-compose -f docker-compose.vps.yml restart
```

### **Dados Foram Perdidos - Como Recuperar?**

```bash
# Listar backups disponíveis
ls -lh /root/advocaciapitanga/backups/

# Restaurar backup específico
bash scripts/restore-database.sh backups/postgres_backup_TIMESTAMP.sql
```

### **Migration Falhou - O Que Fazer?**

O sistema fará rollback automático do backup. Se precisar intervir manualmente:

```bash
# Ver status das migrations
docker exec advocacia-vps sh -c "cd /app && npx prisma migrate status --schema=./packages/database/prisma/schema.prisma"

# Restaurar backup
bash scripts/restore-database.sh backups/latest.sql

# Corrigir migration localmente e fazer push novamente
```

---

## 📊 Monitoramento

### **Health Check**

```bash
curl http://localhost:3190/health
curl https://advocaciapitanga.com.br/health
```

### **Logs em Tempo Real**

```bash
# Todos os logs
docker-compose -f docker-compose.vps.yml logs -f

# Apenas aplicação
docker logs -f advocacia-vps

# Apenas banco de dados
docker logs -f advocacia-postgres
```

### **Uso de Disco dos Volumes**

```bash
docker system df -v | grep -E "postgres_data|uploads_data"
```

---

## 🔐 Segurança

### **Backups**
- ✅ Backups automáticos antes de cada deploy
- ✅ Retenção de 7 dias
- ✅ Permissões restritas (600)

### **Volumes**
- ✅ Persistência garantida
- ✅ Validação antes/depois de operações
- ✅ Proteção contra remoção acidental

### **Migrations**
- ✅ Versionamento Git
- ✅ Rollback automático
- ✅ Validação de integridade

---

## 📞 Suporte

Em caso de problemas:

1. Verificar logs dos containers
2. Verificar backups disponíveis
3. Consultar este documento
4. Restaurar último backup se necessário

---

## 🎯 Checklist de Deploy Seguro

Antes de cada deploy, verifique:

- [ ] Migrations foram criadas localmente e commitadas
- [ ] Testes estão passando
- [ ] Não há comandos perigosos no workflow
- [ ] Backups automáticos estão configurados
- [ ] Volumes estão preservados no docker-compose

Durante o deploy:

- [ ] Backup automático foi criado
- [ ] Migrations foram aplicadas com sucesso
- [ ] Validações de integridade passaram
- [ ] Health check está OK

Após o deploy:

- [ ] Aplicação está acessível
- [ ] Dados permanecem intactos
- [ ] Logs não mostram erros críticos
- [ ] Backup foi criado corretamente

---

## 📦 Scripts Disponíveis

### **Backup e Restore:**
- [scripts/backup-database.sh](scripts/backup-database.sh) - Backup manual com validação
- [scripts/backup-remote.sh](scripts/backup-remote.sh) - Envio para locais remotos
- [scripts/restore-database.sh](scripts/restore-database.sh) - Restauração segura

### **Deploy:**
- [scripts/deploy-manual.sh](scripts/deploy-manual.sh) - Deploy manual protegido

### **Notificações:**
- [scripts/notify.sh](scripts/notify.sh) - Sistema de alertas multicanal

---

## 🎯 Fluxo Completo de Deploy Seguro

```
1. GitHub Actions inicia deploy
2. ✅ Verifica volumes existentes
3. ✅ Para containers (SEM -v flag)
4. ✅ Valida volumes após parada
5. ✅ Limpa containers/imagens
6. ✅ Valida volumes após limpeza
7. ✅ Cria BACKUP antes de migrations
8. ✅ Valida integridade do backup
   └─ Verifica SQL válido
   └─ Verifica conclusão
   └─ Verifica tamanho
9. ✅ Envia backup para local remoto (se configurado)
10. ✅ Executa migrations versionadas
11. ❌ Se falhar:
    └─ 🔔 Notifica falha
    └─ 🔄 Restaura backup
    └─ 🔔 Notifica resultado do rollback
12. ✅ Valida integridade dos dados
13. ✅ Health check da aplicação
14. 🔔 Notifica sucesso
15. ✅ Deploy completo!
```

---

**Última atualização**: 2025-12-05

**Versão**: 3.0.0 (Sistema avançado de proteção com validação, backup remoto e notificações)

**Changelog Completo**: Ver [CHANGELOG-DEPLOY-SEGURO.md](CHANGELOG-DEPLOY-SEGURO.md)
