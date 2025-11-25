# 🚀 Guia de Setup Rápido - Advocacia Pitanga

## Instalação em 5 minutos

### 1️⃣ Pré-requisitos
Certifique-se de ter instalado:
- ✅ Node.js 18 ou superior
- ✅ Docker Desktop
- ✅ Git

### 2️⃣ Clonar e Instalar

```bash
cd advocacia-pitanga
npm install
```

### 3️⃣ Iniciar com Docker

```bash
npm run docker:up
```

Aguarde a mensagem: "✅ All containers are running"

### 4️⃣ Configurar Banco de Dados

```bash
# Rodar migrations
npm run db:migrate

# Popular com dados de teste
npm run db:seed
```

### 5️⃣ Acessar

Abra o navegador em: **http://localhost**

## 🔑 Login

### Advogado
```
Email: admin@pitanga.com
Senha: admin123
```

### Cliente
```
Email: maria@email.com
Senha: cliente123
```

## ✅ Verificação

Para verificar se tudo está funcionando:

1. **Backend**: http://localhost/api/health
2. **Frontend**: http://localhost
3. **Banco**: `npm run db:studio`

## 🛑 Parar Aplicação

```bash
npm run docker:down
```

## 📊 Estrutura de Portas

- **Frontend**: 3000 (interno) / 80 (externo via Nginx)
- **Backend**: 3001 (interno) / 80/api (externo via Nginx)
- **PostgreSQL**: 5432
- **Nginx**: 80

## 🐛 Problemas Comuns

### Porta 80 já está em uso
```bash
# Windows: parar serviço que usa porta 80
net stop http

# Ou mudar porta no docker-compose.yml
ports:
  - "8080:80"  # usar 8080 no lugar
```

### Docker não está rodando
```bash
# Iniciar Docker Desktop
# Aguardar até estar completamente inicializado
# Tentar novamente: npm run docker:up
```

### Erro no Prisma
```bash
cd packages/database
npx prisma generate
cd ../..
npm run db:migrate
```

## 📚 Comandos Úteis

```bash
# Ver logs dos containers
npm run docker:logs

# Restart de um serviço específico
docker-compose restart backend

# Limpar tudo e começar do zero
docker-compose down -v
docker system prune -a
npm install
npm run docker:up
npm run db:migrate
npm run db:seed
```

## 🎯 Próximos Passos

Após o setup:

1. Explore a landing page
2. Faça login como advogado
3. Crie um cliente
4. Crie um processo
5. Teste o upload de documentos
6. Faça login como cliente e veja a perspectiva dele

## 💡 Dicas

- Use Prisma Studio para visualizar dados: `npm run db:studio`
- Logs do backend ficam em `apps/backend/error.log`
- Para desenvolvimento sem Docker, rode `npm run dev`

---

**Pronto para usar! 🎉**
