#!/bin/bash

# Script de Restore do PostgreSQL
# Restaura backup em caso de problemas

set -e

echo "=== Restore do PostgreSQL ==="

# Configurações
BACKUP_DIR="/root/advocaciapitanga/backups"
CONTAINER_NAME="advocacia-postgres"
DB_USER="advocacia"
DB_NAME="advocacia_pitanga"

# Verificar se foi passado arquivo de backup
if [ -z "$1" ]; then
    echo "Uso: $0 <arquivo_backup.sql>"
    echo ""
    echo "Backups disponíveis:"
    ls -lh "$BACKUP_DIR"/postgres_backup_*.sql 2>/dev/null || echo "Nenhum backup encontrado"
    echo ""
    echo "Para restaurar o último backup:"
    echo "   $0 ${BACKUP_DIR}/latest.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERRO: Arquivo não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "📁 Arquivo de backup: $BACKUP_FILE"
echo "⚠️  ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados atuais!"
echo ""
read -p "Deseja continuar? (sim/não): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo "Operação cancelada"
    exit 0
fi

# Verificar se container PostgreSQL está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ ERRO: Container PostgreSQL não está rodando!"
    exit 1
fi

echo ""
echo "Restaurando backup..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backup restaurado com sucesso!"

    # Verificar dados restaurados
    TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d '[:space:]')
    echo "📊 Tabelas restauradas: $TABLE_COUNT"

    USER_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d '[:space:]' || echo "N/A")
    echo "👥 Usuários restaurados: $USER_COUNT"
else
    echo ""
    echo "❌ ERRO ao restaurar backup!"
    exit 1
fi
