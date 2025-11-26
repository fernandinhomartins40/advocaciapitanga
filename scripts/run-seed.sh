#!/bin/bash

# Script para executar seed do banco de dados
# Uso: ./scripts/run-seed.sh [opcoes]

set -e

echo "🌱 Executando seed do banco de dados..."
echo ""

# Verificar se está em ambiente Docker ou local
if [ -f "/.dockerenv" ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
    echo "🐳 Detectado ambiente Docker"
    cd /app/packages/database
else
    echo "💻 Detectado ambiente local"
    # Verificar se estamos na raiz do projeto
    if [ ! -d "packages/database" ]; then
        echo "❌ Erro: Execute este script da raiz do projeto"
        exit 1
    fi
    cd packages/database
fi

# Executar seed
echo "📦 Executando seed..."
if npx prisma db seed; then
    echo ""
    echo "✅ Seed executado com sucesso!"
    echo ""
    echo "📋 Credenciais de acesso:"
    echo ""
    echo "👨‍💼 Advogado:"
    echo "  Email: admin@pitanga.com"
    echo "  Senha: Pitanga@2024!Admin"
    echo ""
    echo "👤 Cliente 1:"
    echo "  Email: maria@email.com"
    echo "  Senha: Pitanga@2024!Cliente"
    echo ""
    echo "👤 Cliente 2:"
    echo "  Email: jose@email.com"
    echo "  Senha: Pitanga@2024!Cliente"
    echo ""
else
    echo ""
    echo "❌ Erro ao executar seed!"
    echo "Verifique os logs acima para mais detalhes"
    exit 1
fi
