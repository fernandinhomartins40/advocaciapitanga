# 🚀 Guia de Instalação - Advocacia Pitanga

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- ✅ **Node.js 18+** ([Download](https://nodejs.org/))
- ✅ **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- ✅ **Git** ([Download](https://git-scm.com/))

## Instalação Passo a Passo

### 1. Navegue até o diretório do projeto

```bash
cd c:\Projetos Cursor\advocaciapitanga
```

### 2. Instale as dependências do monorepo

```bash
npm install
```

Este comando instalará todas as dependências de:
- Root (Turborepo)
- Frontend (Next.js)
- Backend (Express)
- Database (Prisma)

### 3. Inicie os containers Docker

```bash
npm run docker:up
```

Isso criará e iniciará:
- 🐘 PostgreSQL (porta 5432)
- 🔧 Backend (porta 3001)
- ⚛️ Frontend (porta 3000)
- 🌐 Nginx (porta 80)

**Aguarde até ver a mensagem de sucesso nos logs.**

### 4. Configure o banco de dados

Execute as migrations do Prisma:

```bash
npm run db:migrate
```

Quando solicitado, confirme a criação da migration.

### 5. Popule o banco com dados de teste

```bash
npm run db:seed
```

Isso criará:
- 1 Advogado (admin@pitanga.com)
- 2 Clientes (maria@email.com e jose@email.com)
- 3 Processos de exemplo
- Mensagens de teste

### 6. Acesse a aplicação

Abra seu navegador e acesse:

```
http://localhost
```

## 🔑 Credenciais de Teste

### Advogado
```
Email: admin@pitanga.com
Senha: admin123
```

### Cliente 1
```
Email: maria@email.com
Senha: cliente123
```

### Cliente 2
```
Email: jose@email.com
Senha: cliente123
```

## 🛠️ Comandos Úteis

### Ver logs dos containers
```bash
npm run docker:logs
```

### Parar os containers
```bash
npm run docker:down
```

### Restart completo
```bash
npm run docker:down
npm run docker:up
```

### Abrir Prisma Studio (interface visual do banco)
```bash
npm run db:studio
```

### Reset completo do banco (CUIDADO!)
```bash
npm run db:reset
```

## 📊 Verificação da Instalação

Para verificar se tudo está funcionando:

1. ✅ **Frontend**: Acesse http://localhost
2. ✅ **Backend**: Acesse http://localhost/api/health
3. ✅ **Database**: Execute `npm run db:studio`

## 🐛 Troubleshooting

### Porta 80 já está em uso

**Windows:**
```bash
net stop http
# ou
# Altere a porta no docker-compose.yml para 8080
```

**Depois acesse:** http://localhost:8080

### Docker não está rodando

1. Abra o Docker Desktop
2. Aguarde até estar completamente inicializado
3. Execute novamente: `npm run docker:up`

### Erro ao executar migrations

```bash
# Regenerar Prisma Client
cd packages/database
npx prisma generate
cd ../..

# Tentar novamente
npm run db:migrate
```

### "Comando não encontrado"

Certifique-se de estar no diretório raiz do projeto:
```bash
cd c:\Projetos Cursor\advocaciapitanga
```

### Limpar tudo e recomeçar

```bash
# Parar containers
npm run docker:down

# Limpar volumes
docker-compose down -v

# Limpar cache Docker
docker system prune -a

# Reinstalar dependências
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install

# Recomeçar
npm run docker:up
npm run db:migrate
npm run db:seed
```

## 🎓 Próximos Passos

Após a instalação bem-sucedida:

1. ✅ Explore a **landing page** (http://localhost)
2. ✅ Faça login como **advogado**
3. ✅ Navegue pelo **dashboard**
4. ✅ Crie um novo **cliente**
5. ✅ Crie um **processo**
6. ✅ Teste o **upload de documentos**
7. ✅ Experimente a **IA Jurídica**
8. ✅ Faça login como **cliente** e veja a perspectiva dele

## 💡 Dicas

- Use **Prisma Studio** para visualizar os dados: `npm run db:studio`
- Consulte o **README.md** para documentação completa
- Veja **COMANDOS.md** para lista de todos os comandos disponíveis

## 📞 Suporte

Se encontrar problemas:

1. Consulte a seção **Troubleshooting** acima
2. Verifique os logs: `npm run docker:logs`
3. Leia o arquivo **README.md** completo

---

**Pronto para usar! 🎉**
