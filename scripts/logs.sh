#!/bin/bash

# Script para visualizar logs da aplicação na VPS

VPS_HOST="72.60.10.112"
VPS_USER="root"
APP_DIR="/root/advocaciapitanga"

echo "Visualizando logs da aplicação..."
echo ""
echo "Comandos disponíveis:"
echo "  - Ctrl+C para sair"
echo ""

ssh ${VPS_USER}@${VPS_HOST} "cd ${APP_DIR} && docker-compose -f docker-compose.vps.yml logs -f --tail=100"
