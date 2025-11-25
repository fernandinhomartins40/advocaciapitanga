#!/bin/bash

# Script para deploy manual na VPS
# Use este script quando precisar fazer deploy sem usar GitHub Actions

set -e

echo "=========================================="
echo "Deploy Manual - Advocacia Pitanga"
echo "=========================================="
echo ""

# Configurações
VPS_HOST="72.60.10.112"
VPS_USER="root"
APP_DIR="/root/advocaciapitanga"

# Verificar se sshpass está instalado
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass não encontrado. Instalando..."
    sudo apt-get update && sudo apt-get install -y sshpass
fi

# Solicitar senha
echo "Digite a senha da VPS:"
read -s VPS_PASSWORD
echo ""

# Salvar senha em arquivo temporário
echo "$VPS_PASSWORD" > /tmp/vps_password
chmod 600 /tmp/vps_password

# Criar diretório no VPS
echo "=== Criando diretório na VPS ==="
sshpass -f /tmp/vps_password ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "mkdir -p ${APP_DIR}"

# Sincronizar código
echo "=== Sincronizando código para VPS ==="
sshpass -f /tmp/vps_password rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.next' \
  --exclude='*.db' \
  --exclude='*.db-*' \
  --exclude='apps/backend/uploads' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='scripts' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ ${VPS_USER}@${VPS_HOST}:${APP_DIR}/

echo "✅ Código sincronizado com sucesso!"
echo ""

# Executar deploy na VPS
echo "=== Executando deploy na VPS ==="
sshpass -f /tmp/vps_password ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

APP_DIR="/root/advocaciapitanga"
cd $APP_DIR

echo "Parando containers..."
docker-compose -f docker-compose.vps.yml down || true

echo "Removendo imagens antigas..."
docker rmi advocaciapitanga-vps 2>/dev/null || true

echo "Construindo nova imagem..."
docker-compose -f docker-compose.vps.yml build --no-cache

echo "Iniciando containers..."
docker-compose -f docker-compose.vps.yml up -d

echo "Aguardando aplicação iniciar (30s)..."
sleep 30

echo "Verificando status..."
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "=== Testando health check ==="
for i in {1..10}; do
  if curl -f http://localhost:3190/health 2>/dev/null; then
    echo "✅ Aplicação está rodando!"
    exit 0
  fi
  echo "Tentativa $i/10..."
  sleep 5
done

echo "⚠️  Health check falhou"
docker logs advocacia-vps --tail=50
ENDSSH

# Limpar arquivo de senha
rm -f /tmp/vps_password

echo ""
echo "=========================================="
echo "✅ Deploy concluído!"
echo "=========================================="
echo ""
echo "URLs:"
echo "  - https://advocaciapitanga.com.br"
echo "  - https://www.advocaciapitanga.com.br"
echo ""
echo "Para ver logs:"
echo "  ssh root@${VPS_HOST}"
echo "  cd ${APP_DIR}"
echo "  docker-compose -f docker-compose.vps.yml logs -f"
