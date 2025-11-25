#!/bin/bash

# Script para configurar SSL/HTTPS com Let's Encrypt
# Execute este script NA VPS após o primeiro deploy bem-sucedido

set -e

echo "=========================================="
echo "Configuração SSL - Advocacia Pitanga"
echo "=========================================="
echo ""

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot não encontrado!"
    echo "Execute primeiro: ./scripts/setup-vps.sh"
    exit 1
fi

# Verificar se Nginx está rodando
if ! systemctl is-active --quiet nginx; then
    echo "❌ Nginx não está rodando!"
    echo "Iniciando Nginx..."
    systemctl start nginx
fi

# Domínios
DOMAIN1="advocaciapitanga.com.br"
DOMAIN2="www.advocaciapitanga.com.br"

echo "Este script irá configurar SSL para:"
echo "  - ${DOMAIN1}"
echo "  - ${DOMAIN2}"
echo ""
echo "IMPORTANTE:"
echo "  1. Os domínios devem estar apontando para este servidor"
echo "  2. A aplicação deve estar rodando na porta 3190"
echo "  3. O Nginx deve estar configurado corretamente"
echo ""
read -p "Continuar? (s/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo "Digite seu email para notificações do Let's Encrypt:"
read EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ Email é obrigatório!"
    exit 1
fi

echo ""
echo "=== Testando conectividade dos domínios ==="

# Testar se domínios resolvem para este servidor
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN1_IP=$(dig +short ${DOMAIN1} | tail -1)
DOMAIN2_IP=$(dig +short ${DOMAIN2} | tail -1)

echo "IP do servidor: ${SERVER_IP}"
echo "IP do ${DOMAIN1}: ${DOMAIN1_IP}"
echo "IP do ${DOMAIN2}: ${DOMAIN2_IP}"

if [ "$SERVER_IP" != "$DOMAIN1_IP" ]; then
    echo "⚠️  AVISO: ${DOMAIN1} não aponta para este servidor!"
    echo "Continue apenas se tiver certeza que o DNS está correto."
    read -p "Continuar mesmo assim? (s/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 0
    fi
fi

echo ""
echo "=== Obtendo certificado SSL ==="

# Obter certificado
certbot --nginx \
    -d ${DOMAIN1} \
    -d ${DOMAIN2} \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ SSL configurado com sucesso!"
    echo "=========================================="
    echo ""
    echo "Seus sites agora estão disponíveis via HTTPS:"
    echo "  - https://${DOMAIN1}"
    echo "  - https://${DOMAIN2}"
    echo ""
    echo "Renovação automática:"
    echo "  - Certificados serão renovados automaticamente"
    echo "  - Para testar renovação: certbot renew --dry-run"
    echo ""
else
    echo ""
    echo "❌ Erro ao configurar SSL!"
    echo ""
    echo "Possíveis problemas:"
    echo "  1. DNS não propagado completamente"
    echo "  2. Firewall bloqueando porta 80/443"
    echo "  3. Nginx mal configurado"
    echo ""
    echo "Verifique os logs:"
    echo "  journalctl -u nginx -f"
    exit 1
fi

# Testar renovação automática
echo "=== Testando renovação automática ==="
certbot renew --dry-run

echo ""
echo "Configuração SSL concluída!"
