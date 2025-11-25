# 🎮 Guia de Comandos - Advocacia Pitanga

## 🚀 Comandos Principais

### Instalação e Setup

```bash
# Instalar todas as dependências do monorepo
npm install

# Subir todos os containers Docker
npm run docker:up

# Parar todos os containers
npm run docker:down

# Rebuild de todos os containers
npm run docker:build
```

### Banco de Dados

```bash
# Rodar migrations
npm run db:migrate

# Criar nova migration
cd packages/database
npx prisma migrate dev --name nome_da_migration

# Popular banco com dados de teste
npm run db:seed

# Abrir Prisma Studio (interface visual do banco)
npm run db:studio

# Reset completo do banco (CUIDADO!)
npm run db:reset

# Gerar Prisma Client
cd packages/database
npx prisma generate
```

### Desenvolvimento

```bash
# Rodar todos os projetos em modo dev (Turborepo)
npm run dev

# Build de produção
npm run build

# Rodar linting
npm run lint
```

### Docker - Comandos Avançados

```bash
# Ver logs de todos os containers
npm run docker:logs

# Ver logs de um container específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Entrar em um container
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres -d advocacia_pitanga

# Restart de um serviço específico
docker-compose restart backend

# Ver status dos containers
docker-compose ps

# Remover containers e volumes
docker-compose down -v
```

## 🔧 Comandos por Workspace

### Backend

```bash
cd apps/backend

# Desenvolvimento
npm run dev

# Build
npm run build

# Rodar build de produção
npm start

# Linting
npm run lint
```

### Frontend

```bash
cd apps/frontend

# Desenvolvimento
npm run dev

# Build
npm run build

# Rodar build de produção
npm start

# Linting
npm run lint
```

### Database

```bash
cd packages/database

# Gerar Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate dev

# Criar migration
npx prisma migrate dev --name nome

# Studio
npx prisma studio

# Seed
npm run seed
```

## 🧪 Testes e Debugging

### Testar API Backend

```bash
# Health check
curl http://localhost/api/health

# Login advogado
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pitanga.com","password":"admin123"}'

# Login cliente
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@email.com","password":"cliente123"}'

# Listar processos (substitua SEU_TOKEN)
curl http://localhost/api/processos \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Acessar PostgreSQL

```bash
# Via Docker
docker-compose exec postgres psql -U postgres -d advocacia_pitanga

# Via linha de comando local (se tiver psql instalado)
psql -h localhost -U postgres -d advocacia_pitanga
# Senha: postgres123

# Comandos úteis dentro do psql:
\dt                    # Listar tabelas
\d User                # Descrever tabela User
SELECT * FROM "User";  # Selecionar todos os usuários
\q                     # Sair
```

## 🐛 Debugging e Troubleshooting

### Limpar tudo e começar do zero

```bash
# 1. Parar containers
npm run docker:down

# 2. Limpar volumes Docker
docker-compose down -v

# 3. Limpar imagens e cache
docker system prune -a

# 4. Limpar node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# 5. Reinstalar
npm install

# 6. Subir novamente
npm run docker:up

# 7. Migrations e seed
npm run db:migrate
npm run db:seed
```

### Verificar problemas de porta

```bash
# Windows
netstat -ano | findstr :80
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# Linux/Mac
lsof -i :80
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Matar processo em uma porta (Windows)
taskkill /PID <PID> /F

# Matar processo em uma porta (Linux/Mac)
kill -9 <PID>
```

### Logs e Debugging

```bash
# Ver logs do backend
docker-compose logs -f backend

# Ver logs do frontend
docker-compose logs -f frontend

# Ver todos os logs
docker-compose logs -f

# Ver logs de erro do backend (arquivo)
cat apps/backend/error.log

# Limpar logs
rm apps/backend/*.log
```

## 📦 Git e Deploy

### Git Workflow

```bash
# Inicializar repositório (se ainda não fez)
git init
git add .
git commit -m "feat: sistema advocacia pitanga completo"

# Conectar com repositório remoto
git remote add origin https://github.com/seu-usuario/advocacia-pitanga.git
git push -u origin main

# Commits convencionais
git commit -m "feat: adiciona dashboard do advogado"
git commit -m "fix: corrige upload de documentos"
git commit -m "docs: atualiza README"
```

### Deploy (Produção)

```bash
# Build de produção
npm run build

# Subir em produção
docker-compose -f docker-compose.prod.yml up -d

# Rodar migrations em produção
NODE_ENV=production npm run db:migrate
```

## 🔐 Segurança

### Gerar nova JWT Secret

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Atualizar no .env
JWT_SECRET="nova_secret_gerada"
```

### Verificar Vulnerabilidades

```bash
# npm audit
npm audit

# Corrigir automaticamente
npm audit fix

# Atualizar dependências
npm update
```

## 📊 Monitoramento

### Ver uso de recursos

```bash
# Docker stats
docker stats

# Espaço em disco
docker system df

# Ver processos Node.js
ps aux | grep node

# Ver uso de memória
docker-compose exec backend top
```

## 🎯 Comandos Rápidos

```bash
# Setup completo do zero
npm install && npm run docker:up && npm run db:migrate && npm run db:seed

# Restart completo
npm run docker:down && npm run docker:up

# Rebuild e restart
npm run docker:down && npm run docker:build && npm run docker:up

# Ver tudo funcionando
docker-compose ps && curl http://localhost/api/health
```

## 📱 URLs Importantes

```bash
# Aplicação
http://localhost              # Frontend
http://localhost/api/health   # Health check backend

# Desenvolvimento
http://localhost:3000         # Frontend direto
http://localhost:3001         # Backend direto

# Database
http://localhost:5555         # Prisma Studio (após npm run db:studio)
localhost:5432                # PostgreSQL
```

## 💡 Dicas Úteis

### Desenvolvimento Paralelo

```bash
# Terminal 1 - Backend
cd apps/backend && npm run dev

# Terminal 2 - Frontend
cd apps/frontend && npm run dev

# Terminal 3 - Prisma Studio
npm run db:studio

# Terminal 4 - Logs Docker
docker-compose logs -f postgres
```

### Backup do Banco

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres advocacia_pitanga > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres advocacia_pitanga < backup.sql
```

### Hot Reload

Os containers já estão configurados com volumes para hot reload:
- Backend: qualquer alteração em `apps/backend/src` reinicia automaticamente
- Frontend: qualquer alteração em `apps/frontend/src` atualiza automaticamente

---

**Mantenha este arquivo aberto para referência rápida! 📌**
