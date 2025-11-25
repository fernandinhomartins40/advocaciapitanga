# 🚀 Deploy - Advocacia Pitanga

Documentação completa para deploy da aplicação Advocacia Pitanga na VPS.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Configuração Inicial](#configuração-inicial)
- [Deploy](#deploy)
- [SSL/HTTPS](#sslhttps)
- [Manutenção](#manutenção)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### Arquitetura

```
Internet (HTTPS:443/HTTP:80)
    ↓
Nginx Host VPS
    ↓
Container Docker (porta 3190)
    ↓
Nginx Interno (porta 80)
    ├─→ Backend (porta 3001)
    └─→ Frontend (porta 3000)
```

### Componentes

- **VPS**: 72.60.10.112
- **Domínios**:
  - advocaciapitanga.com.br
  - www.advocaciapitanga.com.br
- **Porta Exposta**: 3190
- **Containers**:
  - `advocacia-vps`: Aplicação principal (Backend + Frontend + Nginx)
  - `advocacia-postgres`: Banco de dados PostgreSQL

---

## ✅ Pré-requisitos

### Na Máquina Local

- Git
- Node.js 18+
- Acesso SSH à VPS

### Na VPS

- Ubuntu 20.04+ ou similar
- Docker e Docker Compose
- Nginx
- Certbot (para SSL)

---

## 🔧 Configuração Inicial

### 1. Configurar VPS

Execute o script de setup (apenas na primeira vez):

```bash
chmod +x scripts/*.sh
./scripts/setup-vps.sh
```

Este script irá:
- Instalar Docker e Docker Compose
- Instalar e configurar Nginx
- Instalar Certbot para SSL
- Configurar firewall (portas 80, 443, 3190)

### 2. Configurar DNS

Configure os registros DNS dos domínios para apontar para a VPS:

```
Tipo    Nome                        Valor
A       advocaciapitanga.com.br     72.60.10.112
A       www.advocaciapitanga.com.br 72.60.10.112
```

**Aguarde a propagação DNS** (pode levar até 48h, geralmente 1-2h)

Verifique com:
```bash
dig advocaciapitanga.com.br
dig www.advocaciapitanga.com.br
```

### 3. Configurar GitHub Secrets

No repositório GitHub, adicione os secrets:

1. Acesse: `Settings → Secrets and variables → Actions`
2. Adicione os seguintes secrets:

| Nome | Descrição | Exemplo |
|------|-----------|---------|
| `VPS_PASSWORD` | Senha SSH da VPS | `senha-super-segura` |
| `OPENAI_API_KEY` | Chave API OpenAI (opcional) | `sk-...` |

---

## 🚀 Deploy

### Deploy Automático (Recomendado)

O deploy automático ocorre via GitHub Actions:

1. **Push para main**:
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

2. **Deploy manual via GitHub**:
   - Acesse `Actions` no GitHub
   - Selecione `Deploy Advocacia Pitanga to VPS`
   - Clique em `Run workflow`

### Deploy Manual

Para deploy manual sem usar GitHub Actions:

```bash
./scripts/deploy-manual.sh
```

O script irá:
1. Sincronizar código com a VPS via rsync
2. Construir nova imagem Docker
3. Parar containers antigos
4. Iniciar novos containers
5. Executar migrations
6. Verificar health check

---

## 🔒 SSL/HTTPS

### Configurar SSL (Executar NA VPS)

**Importante**: Execute apenas APÓS o primeiro deploy bem-sucedido.

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
chmod +x scripts/ssl-setup.sh
./scripts/ssl-setup.sh
```

O script irá:
1. Verificar se domínios apontam para a VPS
2. Obter certificados Let's Encrypt
3. Configurar renovação automática
4. Redirecionar HTTP → HTTPS

### Renovação Automática

Os certificados são renovados automaticamente pelo certbot.

Teste a renovação:
```bash
sudo certbot renew --dry-run
```

---

## 🔧 Manutenção

### Ver Logs

```bash
# Opção 1: Via script (da máquina local)
./scripts/logs.sh

# Opção 2: Diretamente na VPS
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml logs -f

# Ver logs de um serviço específico
docker logs advocacia-vps -f
docker logs advocacia-postgres -f
```

### Verificar Status

```bash
# Via script (da máquina local)
./scripts/status.sh

# Diretamente na VPS
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml ps
```

### Reiniciar Aplicação

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml restart
```

### Parar Aplicação

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml down
```

### Iniciar Aplicação

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml up -d
```

### Atualizar Dependências

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga

# Rebuildar imagens
docker-compose -f docker-compose.vps.yml build --no-cache

# Reiniciar
docker-compose -f docker-compose.vps.yml up -d
```

### Executar Migrations

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker exec advocacia-vps npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma
```

### Backup do Banco de Dados

```bash
ssh root@72.60.10.112

# Criar backup
docker exec advocacia-postgres pg_dump -U advocacia advocacia_pitanga > backup-$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i advocacia-postgres psql -U advocacia advocacia_pitanga < backup-20240101.sql
```

### Limpar Docker

```bash
ssh root@72.60.10.112

# Remover containers parados
docker container prune -f

# Remover imagens não utilizadas
docker image prune -af

# Remover volumes não utilizados (CUIDADO!)
docker volume prune -f
```

---

## 🔍 Troubleshooting

### Aplicação não responde

1. **Verificar containers**:
   ```bash
   ssh root@72.60.10.112
   cd /root/advocaciapitanga
   docker-compose -f docker-compose.vps.yml ps
   ```

2. **Ver logs**:
   ```bash
   docker logs advocacia-vps --tail=100
   ```

3. **Verificar health check**:
   ```bash
   curl http://localhost:3190/health
   ```

4. **Reiniciar**:
   ```bash
   docker-compose -f docker-compose.vps.yml restart
   ```

### Erro de conexão com banco de dados

1. **Verificar se PostgreSQL está rodando**:
   ```bash
   docker ps | grep postgres
   ```

2. **Ver logs do PostgreSQL**:
   ```bash
   docker logs advocacia-postgres --tail=50
   ```

3. **Testar conexão**:
   ```bash
   docker exec advocacia-vps sh -c "pg_isready -h postgres -U advocacia"
   ```

### Build falha

1. **Verificar espaço em disco**:
   ```bash
   df -h
   ```

2. **Limpar Docker**:
   ```bash
   docker system prune -af
   ```

3. **Rebuild sem cache**:
   ```bash
   docker-compose -f docker-compose.vps.yml build --no-cache
   ```

### SSL não funciona

1. **Verificar DNS**:
   ```bash
   dig advocaciapitanga.com.br
   ```

2. **Verificar Nginx**:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Reconfigurar SSL**:
   ```bash
   ./scripts/ssl-setup.sh
   ```

### Porta 3190 não acessível

1. **Verificar firewall**:
   ```bash
   sudo ufw status
   sudo ufw allow 3190/tcp
   ```

2. **Verificar se porta está em uso**:
   ```bash
   netstat -tulpn | grep 3190
   ```

3. **Verificar container**:
   ```bash
   docker port advocacia-vps
   ```

---

## 📊 Monitoramento

### Health Check

```bash
# Local
curl https://advocaciapitanga.com.br/health

# Na VPS
curl http://localhost:3190/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "service": "advocacia-pitanga"
}
```

### Recursos do Sistema

```bash
# CPU e Memória dos containers
docker stats --no-stream

# Espaço em disco
df -h

# Uso de volumes
docker system df -v
```

---

## 🔐 Segurança

### Recomendações

1. **Altere as senhas padrão** no arquivo `.env` da VPS
2. **Mantenha o sistema atualizado**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. **Configure backup automático** do banco de dados
4. **Monitore logs** regularmente
5. **Use senhas fortes** nos GitHub Secrets

### Firewall

Portas abertas necessárias:
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 3190 (Aplicação)

---

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs: `./scripts/logs.sh`
2. Verifique o status: `./scripts/status.sh`
3. Consulte esta documentação
4. Entre em contato com o administrador do sistema

---

## 📝 Notas

- **Volumes persistentes**: Os dados do PostgreSQL são mantidos no volume `postgres_data`
- **Uploads**: Arquivos enviados são mantidos no volume `uploads_data`
- **Environment**: Variáveis de ambiente são definidas no `.env` da VPS
- **Logs**: Logs do Nginx estão em `/var/log/nginx/advocaciapitanga-*.log`

---

**Última atualização**: 2024
**Versão**: 1.0.0
