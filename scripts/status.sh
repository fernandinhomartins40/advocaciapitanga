#!/bin/bash

# Script para verificar status da aplicação na VPS

VPS_HOST="72.60.10.112"
VPS_USER="root"
APP_DIR="/root/advocaciapitanga"

echo "=========================================="
echo "Status - Advocacia Pitanga"
echo "=========================================="
echo ""

ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
set -e

cd ${APP_DIR}

echo "=== Status dos Containers ==="
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "=== Uso de Recursos ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "=== Volumes ==="
docker volume ls | grep advocacia

echo ""
echo "=== Health Check ==="
if curl -f http://localhost:3190/health 2>/dev/null; then
    echo "✅ Aplicação está respondendo"
else
    echo "❌ Aplicação não está respondendo"
fi

echo ""
echo "=== Espaço em Disco ==="
df -h | grep -E '^Filesystem|/dev/'

echo ""
echo "=== Últimas Linhas dos Logs ==="
docker logs advocacia-vps --tail=20 2>&1 | tail -20
ENDSSH

echo ""
echo "=========================================="
