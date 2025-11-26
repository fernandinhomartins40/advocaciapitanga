# 🗄️ Database Package - Advocacia Pitanga

Este package contém todo o schema, migrations e seeds do banco de dados PostgreSQL usando Prisma ORM.

## 📋 Estrutura

```
packages/database/
├── prisma/
│   ├── schema.prisma          # Schema do banco de dados
│   ├── seed.ts                # Script de seed (dados iniciais)
│   └── migrations/            # Histórico de migrations
│       └── 20251126123943_init/
│           └── migration.sql  # Migration inicial
└── src/
    └── index.ts               # Exports do Prisma Client
```

## 🚀 Comandos Disponíveis

### Desenvolvimento Local

```bash
# Gerar Prisma Client após mudanças no schema
npm run generate

# Criar nova migration (após alterar schema.prisma)
npm run migrate

# Aplicar migrations pendentes
npx prisma migrate deploy

# Popular banco com dados de teste
npm run seed

# Resetar banco (CUIDADO: apaga todos os dados)
npm run reset

# Abrir Prisma Studio (interface visual)
npm run studio
```

### Produção

```bash
# Aplicar migrations em produção
npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma

# Popular banco com dados iniciais (apenas primeira vez)
npx prisma db seed --schema=./packages/database/prisma/schema.prisma
```

## 🔄 Fluxo de Migrations

### 1. Criar Nova Migration

Quando você modificar o `schema.prisma`:

```bash
cd packages/database
npm run migrate
```

Isso irá:
- Criar um arquivo SQL em `prisma/migrations/`
- Aplicar a migration no seu banco local
- Atualizar o Prisma Client

### 2. Deploy de Migrations

No ambiente de produção (executado automaticamente no CI/CD):

```bash
npx prisma migrate deploy
```

### 3. Fallback: DB Push

Se não houver migrations criadas, o sistema usa `db push`:

```bash
npx prisma db push --accept-data-loss --skip-generate
```

⚠️ **Nota:** `db push` é usado apenas em desenvolvimento ou quando migrations não existem.

## 🌱 Seeds do Banco de Dados

### Dados Criados pelo Seed

O seed cria os seguintes dados iniciais:

#### 👨‍💼 Usuário Administrador (Advogado)
- **Email:** `admin@pitanga.com`
- **Senha:** `Pitanga@2024!Admin`
- **OAB:** SP123456
- **Nome:** Dr. João Silva

#### 👤 Cliente 1
- **Email:** `maria@email.com`
- **Senha:** `Pitanga@2024!Cliente`
- **CPF:** 123.456.789-00
- **Nome:** Maria Santos

#### 👤 Cliente 2
- **Email:** `jose@email.com`
- **Senha:** `Pitanga@2024!Cliente`
- **CPF:** 987.654.321-00
- **Nome:** José Oliveira

### Executar Seed Manualmente

```bash
# Localmente
cd packages/database
npm run seed

# Em container Docker
docker exec advocacia-vps sh -c "cd /app/packages/database && npx prisma db seed"

# Método alternativo
docker exec advocacia-vps sh -c "cd /app && npx tsx packages/database/prisma/seed.ts"
```

### Segurança das Senhas

- Todas as senhas são hasheadas usando **bcryptjs** com 10 rounds
- O hash é gerado durante a execução do seed
- Senhas nunca são armazenadas em texto plano

## 🔍 Verificação e Troubleshooting

### Verificar Status das Migrations

```bash
npx prisma migrate status
```

### Verificar Conexão com Banco

```bash
npx prisma db execute --stdin <<< "SELECT 1"
```

### Contar Usuários no Banco

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\""
```

### Verificar se Admin Existe

```bash
npx prisma db execute --stdin <<< "SELECT email FROM \"User\" WHERE role = 'ADVOGADO'"
```

## 🐳 Uso em Docker

O Dockerfile.vps inclui tudo necessário para migrations e seeds:

1. **Prisma Client** - Gerado durante o build
2. **Migrations** - Copiadas para `/app/packages/database/prisma/migrations/`
3. **tsx e bcryptjs** - Dependências necessárias para executar seeds

### Ordem de Execução no Deploy

1. ✅ Container inicia
2. ✅ Aguarda PostgreSQL estar pronto
3. ✅ Aplica migrations (`prisma migrate deploy`) ou usa `db push`
4. ✅ Valida criação de tabelas
5. ✅ Verifica se seed já foi executado
6. ✅ Executa seed (se necessário)
7. ✅ Valida criação de usuários
8. ✅ Aplicação inicia

## ⚠️ Problemas Comuns

### "Table does not exist"

**Causa:** Migrations não foram aplicadas.

**Solução:**
```bash
npx prisma migrate deploy
# OU
npx prisma db push
```

### "User not found" no login

**Causa:** Seed não foi executado.

**Solução:**
```bash
npm run seed
```

### "tsx: command not found"

**Causa:** tsx não está instalado ou não foi copiado para o container.

**Solução:** Verificar que o Dockerfile.vps copia as dependências corretas:
```dockerfile
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
```

### Seed falha com "Cannot find module"

**Causa:** Dependências do seed (bcryptjs, @prisma/client) não disponíveis.

**Solução:**
1. Verificar que bcryptjs está nas dependencies ou devDependencies
2. Verificar que o Dockerfile copia as dependências necessárias

## 📚 Recursos

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Seeding](https://www.prisma.io/docs/guides/migrate/seed-database)
