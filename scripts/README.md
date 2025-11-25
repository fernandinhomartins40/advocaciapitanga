# Scripts de Deploy

Scripts auxiliares para gerenciar o deploy da aplicação Advocacia Pitanga.

## 📋 Scripts Disponíveis

### `setup-vps.sh`
Configuração inicial da VPS (executar apenas uma vez).

```bash
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh
```

**O que faz:**
- Instala Docker e Docker Compose
- Configura Nginx
- Instala Certbot
- Configura firewall

### `deploy-manual.sh`
Deploy manual da aplicação (alternativa ao GitHub Actions).

```bash
chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh
```

**O que faz:**
- Sincroniza código com a VPS
- Constrói imagens Docker
- Reinicia containers
- Executa migrations

### `ssl-setup.sh`
Configuração de SSL/HTTPS (executar NA VPS após primeiro deploy).

```bash
# Na VPS
ssh root@72.60.10.112
cd /root/advocaciapitanga
chmod +x scripts/ssl-setup.sh
./scripts/ssl-setup.sh
```

**O que faz:**
- Obtém certificados Let's Encrypt
- Configura HTTPS nos domínios
- Configura renovação automática

### `logs.sh`
Visualiza logs da aplicação em tempo real.

```bash
chmod +x scripts/logs.sh
./scripts/logs.sh
```

### `status.sh`
Verifica status da aplicação e recursos.

```bash
chmod +x scripts/status.sh
./scripts/status.sh
```

**O que mostra:**
- Status dos containers
- Uso de CPU e memória
- Health check
- Últimas linhas dos logs

## 🔧 Uso Rápido

### Primeiro Deploy

1. **Setup inicial:**
   ```bash
   ./scripts/setup-vps.sh
   ```

2. **Deploy:**
   ```bash
   ./scripts/deploy-manual.sh
   ```

3. **Configurar SSL (na VPS):**
   ```bash
   ssh root@72.60.10.112
   cd /root/advocaciapitanga
   ./scripts/ssl-setup.sh
   ```

### Deploys Subsequentes

Use GitHub Actions (automático) ou:

```bash
./scripts/deploy-manual.sh
```

### Monitoramento

```bash
# Ver logs
./scripts/logs.sh

# Ver status
./scripts/status.sh
```

## ⚠️ Observações

- Scripts `setup-vps.sh` e `deploy-manual.sh` são executados da **máquina local**
- Script `ssl-setup.sh` deve ser executado **dentro da VPS**
- Scripts `logs.sh` e `status.sh` conectam via SSH da **máquina local**

## 🔐 Requisitos

- SSH configurado para acesso à VPS (72.60.10.112)
- Senha da VPS disponível
- Git configurado
- rsync e sshpass instalados (scripts instalam se necessário)
