# Guia de Deploy no VPS

## Arquitetura

```
Internet (HTTPS 443)
    ↓
Nginx Externo (VPS Host)
    ↓
Container Docker (Porta 3190 → 80)
    ↓
Nginx Interno (Container)
    ↓
├── Backend (3001)
└── Frontend (3000)
```

## Problema Identificado

O erro **502 Bad Gateway** ocorria porque o Nginx externo não estava configurado corretamente para se comunicar com o container na porta 3190.

## Correções Realizadas

### 1. Backend - Melhorias no servidor
- ✅ Adicionado `0.0.0.0` como host para aceitar conexões externas
- ✅ Adicionado tratamento de erros não capturados
- ✅ Melhorado logging de erros
- ✅ Implementado graceful shutdown

### 2. Cookies - Configuração para produção
- ✅ Alterado `sameSite` de `'strict'` para `'none'` em produção (necessário para HTTPS)
- ✅ Mantido `secure: true` em produção

### 3. Nginx Externo - Configuração correta
- ✅ Criado arquivo `nginx-vps-external.conf` com a configuração correta
- ✅ Proxy para `127.0.0.1:3190` (porta do container)

## Passos para Deploy

### 1. No servidor VPS, configure o Nginx externo:

```bash
# Copiar arquivo de configuração
sudo cp nginx-vps-external.conf /etc/nginx/sites-available/advocaciapitanga.com.br

# Criar symlink
sudo ln -sf /etc/nginx/sites-available/advocaciapitanga.com.br /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 2. Build e Deploy do Container:

```bash
# Parar container antigo (se existir)
docker stop advocacia-app 2>/dev/null || true
docker rm advocacia-app 2>/dev/null || true

# Build da imagem
docker build -f Dockerfile.vps -t advocacia-pitanga:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://advocaciapitanga.com.br/api .

# Executar container mapeando porta 3190:80
docker run -d \
  --name advocacia-app \
  --restart unless-stopped \
  -p 3190:80 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public" \
  -e JWT_SECRET="seu-jwt-secret-aqui" \
  -e JWT_REFRESH_SECRET="seu-refresh-secret-aqui" \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e NEXT_PUBLIC_API_URL=https://advocaciapitanga.com.br/api \
  advocacia-pitanga:latest

# Executar migrations (dentro do container)
docker exec advocacia-app npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

# Executar seed (se necessário)
docker exec advocacia-app npx tsx /app/packages/database/src/seed.ts
```

### 3. Verificar logs:

```bash
# Logs do container
docker logs -f advocacia-app

# Logs do Nginx externo
sudo tail -f /var/log/nginx/advocacia-error.log
sudo tail -f /var/log/nginx/advocacia-access.log
```

### 4. Testar a aplicação:

```bash
# Health check
curl https://advocaciapitanga.com.br/health

# API Health check
curl https://advocaciapitanga.com.br/api/health

# Testar login
curl -X POST https://advocaciapitanga.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pitanga.com","password":"Pitanga@2024!Admin"}'
```

## Fluxo de Requisição de Login

1. **Cliente** faz POST para `https://advocaciapitanga.com.br/api/auth/login`
2. **Nginx Externo** (porta 443) recebe e encaminha para `127.0.0.1:3190`
3. **Container Docker** (porta 80 interna) recebe via Nginx Interno
4. **Nginx Interno** roteia `/api/*` para `127.0.0.1:3001` (backend)
5. **Backend** (Express) processa a requisição
6. **AuthService** valida credenciais no PostgreSQL
7. **Response** retorna com cookies httpOnly contendo tokens JWT

## Troubleshooting

### Erro 502 Bad Gateway

**Possíveis causas:**
1. Container não está rodando: `docker ps | grep advocacia`
2. Backend não iniciou: `docker logs advocacia-app`
3. Porta 3190 não está mapeada: `docker port advocacia-app`
4. Nginx externo não configurado: `sudo nginx -t`

### Erro de conexão com banco de dados

```bash
# Verificar se o container consegue conectar ao PostgreSQL
docker exec advocacia-app npx prisma db push --schema=/app/packages/database/prisma/schema.prisma
```

### Backend não inicia

```bash
# Ver logs detalhados
docker logs advocacia-app 2>&1 | grep -A 10 "Erro"

# Verificar variáveis de ambiente
docker exec advocacia-app env | grep -E "DATABASE_URL|NODE_ENV|PORT"
```

## Variáveis de Ambiente Necessárias

```env
# Backend
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
JWT_SECRET=seu-jwt-secret-muito-seguro
JWT_REFRESH_SECRET=seu-refresh-secret-muito-seguro
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://advocaciapitanga.com.br,https://www.advocaciapitanga.com.br

# Frontend (build time)
NEXT_PUBLIC_API_URL=https://advocaciapitanga.com.br/api
```

## Comandos Úteis

```bash
# Reiniciar apenas o backend
docker exec advocacia-app supervisorctl restart backend

# Reiniciar apenas o frontend
docker exec advocacia-app supervisorctl restart frontend

# Ver status dos serviços
docker exec advocacia-app supervisorctl status

# Acessar shell do container
docker exec -it advocacia-app sh

# Rebuild e redeploy completo
docker build -f Dockerfile.vps -t advocacia-pitanga:latest . && \
docker stop advocacia-app && docker rm advocacia-app && \
docker run -d --name advocacia-app --restart unless-stopped \
  -p 3190:80 \
  -e DATABASE_URL="..." \
  advocacia-pitanga:latest
```
