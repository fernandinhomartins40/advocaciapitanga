#!/bin/bash

# Script para configuração inicial da VPS
# Execute este script ANTES do primeiro deploy

set -e

echo "=========================================="
echo "Setup Inicial VPS - Advocacia Pitanga"
echo "=========================================="
echo ""

VPS_HOST="72.60.10.112"
VPS_USER="root"

echo "Este script irá:"
echo "  1. Instalar Docker e Docker Compose"
echo "  2. Configurar Nginx"
echo "  3. Instalar Certbot para SSL"
echo "  4. Configurar firewall"
echo ""
echo "Digite a senha da VPS:"
read -s VPS_PASSWORD
echo ""

# Salvar senha
echo "$VPS_PASSWORD" > /tmp/vps_password
chmod 600 /tmp/vps_password

# Executar setup na VPS
sshpass -f /tmp/vps_password ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
set -e

echo "=== Atualizando sistema ==="
apt-get update && apt-get upgrade -y

echo "=== Instalando dependências ==="
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    nginx \
    certbot \
    python3-certbot-nginx

echo "=== Instalando Docker ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker já instalado"
fi

echo "=== Instalando Docker Compose ==="
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose já instalado"
fi

echo "=== Configurando Nginx ==="
systemctl enable nginx
systemctl start nginx

# Remover configuração default
rm -f /etc/nginx/sites-enabled/default

echo "=== Configurando Firewall ==="
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3190/tcp
    ufw reload
fi

echo "=== Verificando instalações ==="
docker --version
docker-compose --version
nginx -v
certbot --version

echo ""
echo "=========================================="
echo "✅ Setup concluído com sucesso!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo ""
echo "1. Configure os DNS dos domínios para apontar para este servidor:"
echo "   advocaciapitanga.com.br → ${VPS_HOST}"
echo "   www.advocaciapitanga.com.br → ${VPS_HOST}"
echo ""
echo "2. Aguarde a propagação DNS (pode levar até 48h)"
echo ""
echo "3. Execute o primeiro deploy:"
echo "   ./scripts/deploy-manual.sh"
echo ""
echo "4. Configure SSL após o deploy:"
echo "   sudo certbot --nginx -d advocaciapitanga.com.br -d www.advocaciapitanga.com.br"
echo ""
ENDSSH

# Limpar senha
rm -f /tmp/vps_password

echo "Setup finalizado!"
