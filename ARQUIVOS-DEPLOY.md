# 📁 Arquivos de Deploy Criados

Lista completa de todos os arquivos criados para o sistema de deploy.

## 🔧 Arquivos Principais

### 1. Workflow GitHub Actions
- **Arquivo**: [.github/workflows/deploy-vps.yml](.github/workflows/deploy-vps.yml)
- **Descrição**: Workflow automático que executa o deploy quando há push na branch main
- **Trigger**: Push para main ou execução manual
- **Porta**: 3190
- **Domínios**: advocaciapitanga.com.br, www.advocaciapitanga.com.br

### 2. Docker Compose VPS
- **Arquivo**: [docker-compose.vps.yml](docker-compose.vps.yml)
- **Descrição**: Configuração Docker Compose otimizada para produção
- **Serviços**:
  - `app`: Aplicação principal (Backend + Frontend + Nginx)
  - `postgres`: Banco de dados PostgreSQL
- **Volumes**:
  - `postgres_data`: Dados do banco
  - `uploads_data`: Arquivos enviados
- **Porta Exposta**: 3190 → 80 (interno)

### 3. Dockerfile VPS
- **Arquivo**: [Dockerfile.vps](Dockerfile.vps)
- **Descrição**: Dockerfile multi-stage otimizado para produção
- **Características**:
  - Build único para backend e frontend
  - Nginx interno para roteamento
  - Supervisor para gerenciar processos
  - Imagem Alpine (leve)
- **Processos**:
  - Backend (porta 3001)
  - Frontend (porta 3000)
  - Nginx (porta 80)

### 4. Configuração Nginx Interna
- **Arquivo**: [nginx.vps.conf](nginx.vps.conf)
- **Descrição**: Nginx que roda DENTRO do container
- **Roteamento**:
  - `/api` → Backend (3001)
  - `/` → Frontend (3000)
  - `/health` → Health check

## 📜 Scripts de Automação

### 5. Setup VPS
- **Arquivo**: [scripts/setup-vps.sh](scripts/setup-vps.sh)
- **Descrição**: Configuração inicial da VPS
- **Executar**: Uma única vez, antes do primeiro deploy
- **Instala**:
  - Docker e Docker Compose
  - Nginx
  - Certbot
  - Configura firewall

### 6. Deploy Manual
- **Arquivo**: [scripts/deploy-manual.sh](scripts/deploy-manual.sh)
- **Descrição**: Deploy manual sem GitHub Actions
- **Executar**: Da máquina local
- **Ações**:
  - Sync via rsync
  - Build Docker
  - Restart containers
  - Health check

### 7. Setup SSL
- **Arquivo**: [scripts/ssl-setup.sh](scripts/ssl-setup.sh)
- **Descrição**: Configura SSL/HTTPS com Let's Encrypt
- **Executar**: NA VPS, após primeiro deploy
- **Configura**:
  - Certificados SSL
  - Redirecionamento HTTPS
  - Renovação automática

### 8. Logs
- **Arquivo**: [scripts/logs.sh](scripts/logs.sh)
- **Descrição**: Visualiza logs em tempo real
- **Executar**: Da máquina local

### 9. Status
- **Arquivo**: [scripts/status.sh](scripts/status.sh)
- **Descrição**: Mostra status completo da aplicação
- **Executar**: Da máquina local
- **Mostra**:
  - Status containers
  - Uso de recursos
  - Health check
  - Últimos logs

## 📚 Documentação

### 10. Documentação Completa
- **Arquivo**: [DEPLOY.md](DEPLOY.md)
- **Conteúdo**:
  - Visão geral da arquitetura
  - Pré-requisitos
  - Configuração inicial
  - Processo de deploy
  - SSL/HTTPS
  - Manutenção
  - Troubleshooting
  - Monitoramento

### 11. Guia Rápido
- **Arquivo**: [DEPLOY-QUICK-START.md](DEPLOY-QUICK-START.md)
- **Conteúdo**:
  - Setup em 5 minutos
  - Comandos essenciais
  - Troubleshooting rápido

### 12. README Scripts
- **Arquivo**: [scripts/README.md](scripts/README.md)
- **Conteúdo**:
  - Descrição de cada script
  - Como usar
  - Exemplos práticos

### 13. Este Arquivo
- **Arquivo**: [ARQUIVOS-DEPLOY.md](ARQUIVOS-DEPLOY.md)
- **Conteúdo**: Lista de todos os arquivos criados

## 🗂️ Estrutura de Diretórios

```
advocaciapitanga/
├── .github/
│   └── workflows/
│       └── deploy-vps.yml          # Workflow GitHub Actions
├── scripts/
│   ├── setup-vps.sh               # Setup inicial VPS
│   ├── deploy-manual.sh           # Deploy manual
│   ├── ssl-setup.sh               # Configurar SSL
│   ├── logs.sh                    # Ver logs
│   ├── status.sh                  # Ver status
│   └── README.md                  # Doc dos scripts
├── docker-compose.vps.yml         # Docker Compose produção
├── Dockerfile.vps                 # Dockerfile produção
├── nginx.vps.conf                 # Nginx interno
├── DEPLOY.md                      # Documentação completa
├── DEPLOY-QUICK-START.md          # Guia rápido
└── ARQUIVOS-DEPLOY.md             # Este arquivo
```

## 🔐 Secrets Necessários

Configure no GitHub (`Settings → Secrets → Actions`):

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `VPS_PASSWORD` | Senha SSH da VPS | ✅ Sim |
| `OPENAI_API_KEY` | Chave OpenAI | ❌ Opcional |

## 🌐 Configuração DNS

| Registro | Nome | Tipo | Valor | TTL |
|----------|------|------|-------|-----|
| @ | advocaciapitanga.com.br | A | 72.60.10.112 | 3600 |
| www | www.advocaciapitanga.com.br | A | 72.60.10.112 | 3600 |

## 📊 Fluxo de Deploy

### Deploy Automático (GitHub Actions)
```
git push origin main
    ↓
GitHub Actions Trigger
    ↓
Sync código → VPS
    ↓
Build Docker images
    ↓
Stop containers
    ↓
Start containers
    ↓
Run migrations
    ↓
Health check
    ↓
✅ Deploy completo
```

### Deploy Manual
```
./scripts/deploy-manual.sh
    ↓
Sync código → VPS (rsync)
    ↓
SSH na VPS
    ↓
Build + Deploy
    ↓
✅ Deploy completo
```

## 🔒 SSL/HTTPS

### Configuração (Uma vez)
```
ssh root@72.60.10.112
cd /root/advocaciapitanga
./scripts/ssl-setup.sh
    ↓
Certbot obtém certificados
    ↓
Nginx configurado
    ↓
✅ HTTPS ativo
```

### Renovação Automática
- Certbot renova automaticamente a cada 60 dias
- Cronjob: `0 0,12 * * * certbot renew --quiet`

## 🎯 Portas

| Serviço | Porta Externa | Porta Interna | Descrição |
|---------|---------------|---------------|-----------|
| Nginx VPS | 80, 443 | - | HTTP/HTTPS público |
| Container | 3190 | 80 | Aplicação |
| Nginx Interno | - | 80 | Roteamento interno |
| Backend | - | 3001 | API Node.js |
| Frontend | - | 3000 | Next.js |
| PostgreSQL | - | 5432 | Banco de dados |

## 📦 Volumes Docker

| Volume | Descrição | Backup Recomendado |
|--------|-----------|-------------------|
| `postgres_data` | Dados do PostgreSQL | ✅ Diário |
| `uploads_data` | Arquivos enviados | ✅ Semanal |

## ✅ Checklist de Deploy

### Primeira Vez
- [ ] Configurar DNS
- [ ] Adicionar GitHub Secrets
- [ ] Executar `setup-vps.sh`
- [ ] Aguardar propagação DNS (1-48h)
- [ ] Deploy (automático ou manual)
- [ ] Executar `ssl-setup.sh` na VPS
- [ ] Testar HTTPS

### Deploys Subsequentes
- [ ] Push para main (ou deploy manual)
- [ ] Verificar GitHub Actions
- [ ] Testar aplicação
- [ ] Verificar logs

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Deploy falhou | Ver logs GitHub Actions |
| App não responde | `./scripts/status.sh` e `./scripts/logs.sh` |
| SSL não funciona | Verificar DNS, executar `ssl-setup.sh` |
| DB não conecta | `docker logs advocacia-postgres` |
| Sem espaço | `docker system prune -af` |

## 📞 Comandos Úteis

```bash
# Status completo
./scripts/status.sh

# Ver logs
./scripts/logs.sh

# Deploy manual
./scripts/deploy-manual.sh

# Reiniciar (na VPS)
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml restart

# Migrations (na VPS)
docker exec advocacia-vps npx prisma migrate deploy

# Backup DB (na VPS)
docker exec advocacia-postgres pg_dump -U advocacia advocacia_pitanga > backup.sql
```

---

**Versão**: 1.0.0
**Data**: 2024
**VPS**: 72.60.10.112
**Porta**: 3190
**Domínios**: advocaciapitanga.com.br, www.advocaciapitanga.com.br
