#!/bin/bash

# Script de Backup Automático do PostgreSQL
# Cria backup antes de cada deploy para garantir segurança dos dados

set -e

echo "=== Backup Automático do PostgreSQL ==="

# Configurações
BACKUP_DIR="/root/advocaciapitanga/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="advocacia-postgres"
DB_USER="advocacia"
DB_NAME="advocacia_pitanga"

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

# Verificar se container PostgreSQL está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "⚠️ Container PostgreSQL não está rodando, pulando backup"
    exit 0
fi

# Verificar se banco tem dados
echo "Verificando se banco de dados tem dados..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d '[:space:]' || echo "0")

if [ "$TABLE_COUNT" = "0" ] || [ -z "$TABLE_COUNT" ]; then
    echo "ℹ️ Banco de dados vazio, backup não necessário"
    exit 0
fi

echo "📊 Banco tem $TABLE_COUNT tabela(s), criando backup..."

# Criar backup
echo "Criando backup em: $BACKUP_FILE"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$BACKUP_FILE"

# Verificar se backup foi criado
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup criado com sucesso: $BACKUP_FILE ($BACKUP_SIZE)"

    # MELHORIA 1: Validar integridade do backup
    echo ""
    echo "🔍 Validando integridade do backup..."

    # Verificar se backup contém comandos SQL válidos
    if grep -q "CREATE TABLE\|INSERT INTO\|COPY" "$BACKUP_FILE"; then
        echo "✅ Backup contém estrutura SQL válida"

        # Verificar se backup não está corrompido (verificação básica)
        if tail -n 1 "$BACKUP_FILE" | grep -q "PostgreSQL database dump complete"; then
            echo "✅ Backup completo e íntegro"
        else
            echo "⚠️ AVISO: Backup pode estar incompleto (falta marcador de fim)"
            echo "   O backup foi criado mas pode ter sido interrompido"
        fi

        # Verificar tamanho mínimo (backup válido deve ter pelo menos 1KB)
        BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
        if [ "$BACKUP_SIZE_BYTES" -gt 1024 ]; then
            echo "✅ Tamanho do backup adequado: $BACKUP_SIZE"
        else
            echo "❌ ERRO: Backup muito pequeno (${BACKUP_SIZE}), pode estar vazio ou corrompido"
            exit 1
        fi
    else
        echo "❌ ERRO: Backup não contém comandos SQL válidos!"
        echo "   O arquivo pode estar corrompido ou vazio"
        exit 1
    fi

    # Criar link simbólico para último backup
    ln -sf "$BACKUP_FILE" "${BACKUP_DIR}/latest.sql"
    echo "🔗 Link simbólico atualizado: ${BACKUP_DIR}/latest.sql"
else
    echo "❌ ERRO: Falha ao criar backup!"
    exit 1
fi

# Limpar backups antigos (manter últimos 7 dias)
echo "Limpando backups antigos (mantendo últimos 7 dias)..."
find "$BACKUP_DIR" -name "postgres_backup_*.sql" -type f -mtime +7 -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "postgres_backup_*.sql" -type f | wc -l)
echo "📦 Backups disponíveis: $REMAINING_BACKUPS"

# Listar backups disponíveis
echo ""
echo "=== Backups Disponíveis ==="
ls -lh "$BACKUP_DIR"/postgres_backup_*.sql 2>/dev/null | tail -5 || echo "Nenhum backup anterior encontrado"

echo ""
echo "✅ Backup concluído com sucesso!"
echo "📁 Arquivo: $BACKUP_FILE"
echo ""
echo "💡 Para restaurar este backup:"
echo "   docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
