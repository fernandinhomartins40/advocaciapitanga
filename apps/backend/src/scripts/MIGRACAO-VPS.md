# Migração VPS - Números de Processo CNJ

## Comandos para Executar na VPS

### 1. Conectar na VPS
```bash
ssh ubuntu@IP_DA_VPS
```

### 2. Ir para o diretório do projeto
```bash
cd ~/advocaciapitanga
```

### 3. Atualizar código
```bash
git pull origin main
```

### 4. Backup automático + Migração
```bash
chmod +x apps/backend/src/scripts/backup-e-migrar-vps.sh
./apps/backend/src/scripts/backup-e-migrar-vps.sh
```

### OU Passo a Passo Manual:

#### Backup
```bash
sudo -u postgres pg_dump advocacia_pitanga > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Verificar
```bash
cd apps/backend
npx tsx src/scripts/verificar-numeros-processo.ts
```

#### Migrar
```bash
npx tsx src/scripts/normalizar-numeros-processo.ts
```

## Rollback se necessário
```bash
sudo -u postgres psql advocacia_pitanga < backup_TIMESTAMP.sql
```
