#!/bin/bash

# Script de Backup Remoto/Offsite
# Envia backups para locais remotos seguros (S3, servidor remoto, etc)

set -e

echo "=== Backup Remoto/Offsite ==="

# Configurações
BACKUP_DIR="/root/advocaciapitanga/backups"
BACKUP_FILE="${1:-${BACKUP_DIR}/latest.sql}"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERRO: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📁 Arquivo: $BACKUP_FILE ($BACKUP_SIZE)"
echo ""

# Contadores de sucesso/falha
SUCCESS_COUNT=0
FAIL_COUNT=0
REMOTE_LOCATIONS=""

# ========================================
# OPÇÃO 1: AWS S3
# ========================================
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ] && [ -n "${AWS_S3_BUCKET:-}" ]; then
    echo "🌐 Enviando para AWS S3..."

    # Instalar AWS CLI se necessário
    if ! command -v aws &> /dev/null; then
        echo "Instalando AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
        unzip -q /tmp/awscliv2.zip -d /tmp/
        /tmp/aws/install
        rm -rf /tmp/aws /tmp/awscliv2.zip
    fi

    # Nome do arquivo no S3
    S3_KEY="backups/$(basename "$BACKUP_FILE")"

    # Upload para S3
    if aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BUCKET}/${S3_KEY}" --no-progress; then
        echo "✅ Backup enviado para S3: s3://${AWS_S3_BUCKET}/${S3_KEY}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        REMOTE_LOCATIONS="${REMOTE_LOCATIONS}\n   - AWS S3: s3://${AWS_S3_BUCKET}/${S3_KEY}"

        # Limpar backups antigos no S3 (manter últimos 30 dias)
        echo "🧹 Limpando backups antigos no S3 (>30 dias)..."
        CUTOFF_DATE=$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null)
        aws s3 ls "s3://${AWS_S3_BUCKET}/backups/" | while read -r line; do
            FILE_DATE=$(echo "$line" | awk '{print $1}')
            FILE_NAME=$(echo "$line" | awk '{print $4}')
            if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]] && [[ -n "$FILE_NAME" ]]; then
                aws s3 rm "s3://${AWS_S3_BUCKET}/backups/${FILE_NAME}"
                echo "   Removido: $FILE_NAME"
            fi
        done
    else
        echo "❌ ERRO ao enviar para S3"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  AWS S3 não configurado (defina AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET)"
    echo ""
fi

# ========================================
# OPÇÃO 2: Servidor Remoto via SCP/RSYNC
# ========================================
if [ -n "${REMOTE_BACKUP_HOST:-}" ] && [ -n "${REMOTE_BACKUP_PATH:-}" ]; then
    echo "🖥️  Enviando para servidor remoto..."

    # Verificar método de autenticação
    if [ -n "${REMOTE_BACKUP_KEY:-}" ]; then
        # Usar chave SSH
        SCP_OPTS="-i ${REMOTE_BACKUP_KEY} -o StrictHostKeyChecking=no"
    elif [ -n "${REMOTE_BACKUP_PASSWORD:-}" ]; then
        # Usar senha (requer sshpass)
        if ! command -v sshpass &> /dev/null; then
            echo "Instalando sshpass..."
            apt-get update -qq && apt-get install -y sshpass
        fi
        SCP_OPTS="-o StrictHostKeyChecking=no"
    else
        echo "❌ ERRO: Defina REMOTE_BACKUP_KEY ou REMOTE_BACKUP_PASSWORD"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        SCP_OPTS=""
    fi

    if [ -n "$SCP_OPTS" ]; then
        # Criar diretório remoto se não existir
        REMOTE_USER="${REMOTE_BACKUP_USER:-root}"

        if [ -n "${REMOTE_BACKUP_PASSWORD:-}" ]; then
            sshpass -p "$REMOTE_BACKUP_PASSWORD" ssh $SCP_OPTS "${REMOTE_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p ${REMOTE_BACKUP_PATH}"
            # Enviar arquivo
            if sshpass -p "$REMOTE_BACKUP_PASSWORD" scp $SCP_OPTS "$BACKUP_FILE" "${REMOTE_USER}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}/"; then
                echo "✅ Backup enviado para servidor remoto: ${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                REMOTE_LOCATIONS="${REMOTE_LOCATIONS}\n   - Servidor remoto: ${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}"
            else
                echo "❌ ERRO ao enviar para servidor remoto"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        else
            ssh $SCP_OPTS "${REMOTE_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p ${REMOTE_BACKUP_PATH}"
            # Enviar arquivo
            if scp $SCP_OPTS "$BACKUP_FILE" "${REMOTE_USER}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}/"; then
                echo "✅ Backup enviado para servidor remoto: ${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                REMOTE_LOCATIONS="${REMOTE_LOCATIONS}\n   - Servidor remoto: ${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}"
            else
                echo "❌ ERRO ao enviar para servidor remoto"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        fi
    fi
    echo ""
else
    echo "⏭️  Servidor remoto não configurado (defina REMOTE_BACKUP_HOST, REMOTE_BACKUP_PATH)"
    echo ""
fi

# ========================================
# OPÇÃO 3: Google Cloud Storage
# ========================================
if [ -n "${GCS_BUCKET:-}" ] && [ -f "${GOOGLE_APPLICATION_CREDENTIALS:-/dev/null}" ]; then
    echo "☁️  Enviando para Google Cloud Storage..."

    # Instalar gsutil se necessário
    if ! command -v gsutil &> /dev/null; then
        echo "Instalando Google Cloud SDK..."
        curl https://sdk.cloud.google.com | bash -s -- --disable-prompts
        source "$HOME/google-cloud-sdk/path.bash.inc"
    fi

    # Nome do arquivo no GCS
    GCS_KEY="backups/$(basename "$BACKUP_FILE")"

    # Upload para GCS
    if gsutil cp "$BACKUP_FILE" "gs://${GCS_BUCKET}/${GCS_KEY}"; then
        echo "✅ Backup enviado para GCS: gs://${GCS_BUCKET}/${GCS_KEY}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        REMOTE_LOCATIONS="${REMOTE_LOCATIONS}\n   - Google Cloud Storage: gs://${GCS_BUCKET}/${GCS_KEY}"
    else
        echo "❌ ERRO ao enviar para GCS"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Google Cloud Storage não configurado (defina GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS)"
    echo ""
fi

# ========================================
# OPÇÃO 4: Dropbox (via API)
# ========================================
if [ -n "${DROPBOX_ACCESS_TOKEN:-}" ]; then
    echo "📦 Enviando para Dropbox..."

    DROPBOX_PATH="/advocacia-backups/$(basename "$BACKUP_FILE")"

    if curl -X POST https://content.dropboxapi.com/2/files/upload \
        --header "Authorization: Bearer ${DROPBOX_ACCESS_TOKEN}" \
        --header "Dropbox-API-Arg: {\"path\": \"${DROPBOX_PATH}\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}" \
        --header "Content-Type: application/octet-stream" \
        --data-binary @"$BACKUP_FILE" > /dev/null 2>&1; then
        echo "✅ Backup enviado para Dropbox: ${DROPBOX_PATH}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        REMOTE_LOCATIONS="${REMOTE_LOCATIONS}\n   - Dropbox: ${DROPBOX_PATH}"
    else
        echo "❌ ERRO ao enviar para Dropbox"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
else
    echo "⏭️  Dropbox não configurado (defina DROPBOX_ACCESS_TOKEN)"
    echo ""
fi

# ========================================
# RESUMO
# ========================================
echo "========================================"
echo "📊 Resumo do Backup Remoto"
echo "========================================"
echo "Arquivo: $(basename "$BACKUP_FILE")"
echo "Tamanho: $BACKUP_SIZE"
echo "✅ Sucessos: $SUCCESS_COUNT"
echo "❌ Falhas: $FAIL_COUNT"

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo ""
    echo "📍 Locais remotos com backup:"
    echo -e "$REMOTE_LOCATIONS"
fi

echo ""

if [ $SUCCESS_COUNT -eq 0 ]; then
    echo "⚠️  AVISO: Nenhum backup remoto configurado!"
    echo ""
    echo "Para configurar backups remotos, defina as variáveis de ambiente:"
    echo ""
    echo "AWS S3:"
    echo "  export AWS_ACCESS_KEY_ID='your-key'"
    echo "  export AWS_SECRET_ACCESS_KEY='your-secret'"
    echo "  export AWS_S3_BUCKET='your-bucket'"
    echo ""
    echo "Servidor Remoto:"
    echo "  export REMOTE_BACKUP_HOST='backup-server.com'"
    echo "  export REMOTE_BACKUP_PATH='/backups/advocacia'"
    echo "  export REMOTE_BACKUP_USER='root'"
    echo "  export REMOTE_BACKUP_KEY='/path/to/key' ou REMOTE_BACKUP_PASSWORD='senha'"
    echo ""
    echo "Google Cloud Storage:"
    echo "  export GCS_BUCKET='your-bucket'"
    echo "  export GOOGLE_APPLICATION_CREDENTIALS='/path/to/credentials.json'"
    echo ""
    echo "Dropbox:"
    echo "  export DROPBOX_ACCESS_TOKEN='your-token'"
    echo ""
    exit 1
fi

echo "✅ Backup remoto concluído com sucesso!"
exit 0
