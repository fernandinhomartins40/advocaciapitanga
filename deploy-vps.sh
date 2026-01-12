#!/bin/bash

# Script de deploy simplificado para VPS
set -e

VPS_HOST="advocaciapitanga.com.br"
VPS_USER="root"
APP_DIR="/root/advocaciapitanga"

echo "======================================"
echo "Deploy para VPS - Advocacia Pitanga"
echo "======================================"
echo ""

# Sincronizar código (excluindo node_modules, dist, .next, etc.)
echo "=== Sincronizando código ==="
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.next' \
  --exclude='*.db' \
  --exclude='*.db-*' \
  --exclude='apps/backend/uploads' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='backups' \
  ./ ${VPS_USER}@${VPS_HOST}:${APP_DIR}/

echo "✅ Código sincronizado!"
echo ""

# Executar comandos na VPS
echo "=== Executando deploy na VPS ==="
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

APP_DIR="/root/advocaciapitanga"
cd $APP_DIR

echo "Parando containers..."
docker-compose -f docker-compose.vps.yml down

echo "Removendo imagem antiga..."
docker rmi advocaciapitanga-vps 2>/dev/null || true

echo "Construindo nova imagem..."
docker-compose -f docker-compose.vps.yml build --no-cache

echo "Iniciando containers..."
docker-compose -f docker-compose.vps.yml up -d

echo "Aguardando 15 segundos..."
sleep 15

echo "Executando migrations..."
docker exec advocacia-vps sh -c "cd /app && npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma"

echo ""
echo "Status dos containers:"
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "Últimas linhas do log:"
docker logs advocacia-vps --tail 30
ENDSSH

echo ""
echo "======================================"
echo "✅ Deploy concluído!"
echo "======================================"
echo ""
echo "Acesse: https://advocaciapitanga.com.br"
echo ""
