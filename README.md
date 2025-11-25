# Advocacia Pitanga - Sistema Jurídico Completo

Sistema de gestão jurídica completo com arquitetura moderna em monorepo, desenvolvido com Next.js 14, Express, TypeScript, PostgreSQL e integração com IA.

## 🏗️ Arquitetura

- **Monorepo**: Turborepo
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Containerização**: Docker Compose
- **Proxy**: Nginx

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker e Docker Compose
- Chave da API OpenAI (opcional para IA Jurídica)

## 🚀 Instalação e Execução

### 1. Clonar o repositório

```bash
cd advocacia-pitanga
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

O arquivo `.env` já está configurado na raiz com valores padrão:

```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/advocacia_pitanga"
JWT_SECRET="advocacia_pitanga_secret_key_2024"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
OPENAI_API_KEY="sua-chave-openai-aqui"  # Opcional
```

### 4. Subir containers Docker

```bash
npm run docker:up
```

Isso irá:
- Criar container PostgreSQL na porta 5432
- Criar container Backend na porta 3001
- Criar container Frontend na porta 3000
- Criar container Nginx na porta 80

### 5. Rodar migrations do banco de dados

```bash
npm run db:migrate
```

### 6. Popular banco com dados de teste (seed)

```bash
npm run db:seed
```

### 7. Acessar aplicação

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Prisma Studio**: `npm run db:studio`

## 👥 Credenciais de Teste

### Advogado
- Email: `admin@pitanga.com`
- Senha: `admin123`

### Clientes
- Email: `maria@email.com` | Senha: `cliente123`
- Email: `jose@email.com` | Senha: `cliente123`

## 📂 Estrutura do Projeto

```
advocacia-pitanga/
├── apps/
│   ├── frontend/           # Next.js 14 Application
│   │   ├── src/
│   │   │   ├── app/       # App Router (páginas)
│   │   │   ├── components/ # Componentes React
│   │   │   ├── lib/       # Utilitários
│   │   │   └── contexts/  # Contexts (Auth, etc)
│   │   └── Dockerfile
│   │
│   └── backend/            # Express API
│       ├── src/
│       │   ├── routes/    # Rotas da API
│       │   ├── controllers/ # Controllers
│       │   ├── services/  # Lógica de negócio
│       │   ├── middlewares/ # Middlewares
│       │   └── utils/     # Utilitários
│       └── Dockerfile
│
├── packages/
│   └── database/          # Prisma Schema e Migrations
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
│
├── docker-compose.yml
├── nginx.conf
├── turbo.json
└── package.json
```

## 🎯 Funcionalidades Implementadas

### Backend (100% completo)

✅ **Autenticação e Autorização**
- Login com JWT
- Registro de usuários
- Middleware de autenticação
- Controle de acesso por role (ADVOGADO/CLIENTE)

✅ **Gestão de Clientes** (apenas advogados)
- CRUD completo de clientes
- Validação de CPF
- Busca e paginação

✅ **Gestão de Processos**
- CRUD completo
- Filtros por status, cliente, advogado
- Dashboard com estatísticas
- Timeline de eventos

✅ **Gestão de Documentos**
- Upload de arquivos (PDF, DOCX, imagens)
- Download seguro
- Validação de permissões
- Limite de 10MB por arquivo

✅ **Sistema de Mensagens**
- Chat entre advogado e cliente por processo
- Marcação de lidas/não lidas
- Notificações

✅ **IA Jurídica** (requer OpenAI API)
- Geração de peças jurídicas (petições, contestações, recursos, etc)
- Análise de documentos
- Exportação em PDF e DOCX

### Frontend

✅ **Estrutura Base**
- Next.js 14 com App Router
- Tailwind CSS configurado
- shadcn/ui components
- Context de autenticação

✅ **Landing Page**
- Design profissional
- Seções: Hero, Serviços, Sobre, Contato
- Links para login advogado/cliente

✅ **Sistema de Login**
- Toggle advogado/cliente
- Validação de formulário
- Integração com backend

⚠️ **Painéis (Estrutura criada, implementação parcial)**
- Layout base configurado
- Rotas protegidas definidas
- Componentes UI prontos

## 🛠️ Comandos Disponíveis

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento (Turborepo - todos os serviços)
npm run dev

# Build de produção
npm run build

# Linting
npm run lint
```

### Docker

```bash
# Subir todos os containers
npm run docker:up

# Parar containers
npm run docker:down

# Rebuild containers
npm run docker:build

# Ver logs
npm run docker:logs
```

### Banco de Dados

```bash
# Rodar migrations
npm run db:migrate

# Popular banco (seed)
npm run db:seed

# Abrir Prisma Studio
npm run db:studio

# Reset banco (CUIDADO!)
npm run db:reset
```

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Perfil do usuário logado
- `POST /api/auth/logout` - Logout

### Clientes (Advogado only)
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Buscar cliente
- `POST /api/clientes` - Criar cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Deletar cliente

### Processos
- `GET /api/processos` - Listar processos
- `GET /api/processos/:id` - Buscar processo
- `POST /api/processos` - Criar processo (Advogado)
- `PUT /api/processos/:id` - Atualizar processo (Advogado)
- `DELETE /api/processos/:id` - Deletar processo (Advogado)
- `GET /api/processos/dashboard/stats` - Estatísticas (Advogado)

### Documentos
- `GET /api/documentos` - Listar documentos
- `POST /api/documentos` - Upload documento
- `GET /api/documentos/:id/download` - Download
- `DELETE /api/documentos/:id` - Deletar

### Mensagens
- `GET /api/mensagens/processo/:processoId` - Mensagens do processo
- `GET /api/mensagens/nao-lidas` - Mensagens não lidas
- `POST /api/mensagens` - Enviar mensagem
- `PATCH /api/mensagens/:id/lida` - Marcar como lida

### IA Jurídica (Advogado only)
- `POST /api/ia/gerar-peca` - Gerar peça jurídica
- `POST /api/ia/exportar-pdf` - Exportar para PDF
- `POST /api/ia/exportar-docx` - Exportar para DOCX
- `POST /api/ia/analisar-documento` - Analisar documento

## 🔒 Segurança

- ✅ JWT para autenticação
- ✅ Bcrypt para hash de senhas
- ✅ Helmet para headers HTTP seguros
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Validação de inputs
- ✅ SQL Injection protegido (Prisma ORM)

## 📦 Tecnologias Utilizadas

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- Bcrypt
- Multer (upload)
- PDFKit (geração PDF)
- OpenAI API
- Winston (logs)

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Axios
- React Hook Form
- Zod (validação)
- TanStack Query
- Lucide Icons

### DevOps
- Docker
- Docker Compose
- Nginx
- Turborepo
- GitHub Actions (CI/CD)

## 🚀 Deploy em Produção

Sistema completo de deploy automatizado via GitHub Actions.

### Documentação de Deploy

- **[Guia Rápido](DEPLOY-QUICK-START.md)**: Setup em 5 minutos
- **[Documentação Completa](DEPLOY.md)**: Processo completo de deploy
- **[Arquivos Criados](ARQUIVOS-DEPLOY.md)**: Lista de todos os arquivos de deploy

### Deploy Rápido

1. Configure DNS para a VPS (72.60.10.112):
   - advocaciapitanga.com.br
   - www.advocaciapitanga.com.br

2. Configure GitHub Secrets:
   - `VPS_PASSWORD`
   - `OPENAI_API_KEY` (opcional)

3. Push para main:
   ```bash
   git push origin main
   ```

4. Configure SSL (na VPS após primeiro deploy):
   ```bash
   ssh root@72.60.10.112
   cd /root/advocaciapitanga
   ./scripts/ssl-setup.sh
   ```

### URLs de Produção

- **Frontend**: https://advocaciapitanga.com.br
- **Backend API**: https://advocaciapitanga.com.br/api
- **Porta Interna**: 3190

### Scripts Disponíveis

```bash
# Setup inicial VPS (uma vez)
./scripts/setup-vps.sh

# Deploy manual
./scripts/deploy-manual.sh

# Ver logs
./scripts/logs.sh

# Ver status
./scripts/status.sh
```

## 🐛 Troubleshooting

### Porta já em uso
```bash
# Verificar processos usando portas
netstat -ano | findstr :80
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# Parar containers
npm run docker:down
```

### Erro no Prisma
```bash
# Regenerar client
cd packages/database
npx prisma generate
```

### Erro no build do Docker
```bash
# Limpar cache e rebuild
docker-compose down -v
docker system prune -a
npm run docker:build
```

## 📝 Próximos Passos (Para Implementação Completa)

### Painel do Advogado (Pendente)
- [ ] Dashboard com gráficos (Chart.js ou Recharts)
- [ ] Página de gestão de clientes completa
- [ ] Página de gestão de processos completa
- [ ] Gestão de documentos com drag-and-drop
- [ ] Interface IA Jurídica com editor rico
- [ ] Perfil do advogado

### Painel do Cliente (Pendente)
- [ ] Lista de processos do cliente
- [ ] Visualização de documentos
- [ ] Chat com advogado
- [ ] Perfil do cliente

### Melhorias Gerais
- [ ] Testes unitários e E2E
- [ ] CI/CD pipeline
- [ ] Documentação API (Swagger)
- [ ] Sistema de notificações em tempo real (WebSocket)
- [ ] Upload de múltiplos arquivos
- [ ] Busca avançada
- [ ] Exportação de relatórios
- [ ] Modo escuro

## 📞 Suporte

Para dúvidas ou problemas:
- Email: contato@advocaciapitanga.com.br
- Issues: GitHub Issues

## 📄 Licença

Este projeto é proprietário e confidencial.

---

**Desenvolvido com ❤️ usando as melhores práticas de desenvolvimento**
