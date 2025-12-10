#!/bin/bash
# Script automatizado para backup e migração na VPS

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="advocacia_pitanga"
DB_USER="postgres"

mkdir -p $BACKUP_DIR

echo "🔒 Fazendo backup do banco..."
sudo -u postgres pg_dump $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

echo "✅ Backup salvo em: $BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "🔍 Verificando processos..."
cd /home/ubuntu/advocaciapitanga/apps/backend
npx tsx src/scripts/verificar-numeros-processo.ts > $BACKUP_DIR/verificacao_$TIMESTAMP.txt

echo "⚙️  Executando migração..."
npx tsx src/scripts/normalizar-numeros-processo.ts > $BACKUP_DIR/migracao_$TIMESTAMP.txt

echo "✅ Migração concluída!"
echo "📄 Logs em: $BACKUP_DIR/"
