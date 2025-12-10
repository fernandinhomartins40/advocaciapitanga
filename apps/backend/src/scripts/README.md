# Scripts de Migração - Números de Processo CNJ

Este diretório contém scripts para normalizar números de processos existentes no formato CNJ.

## Formato CNJ

O formato CNJ (Conselho Nacional de Justiça) para números de processo é:

```
NNNNNNN-DD.AAAA.J.TT.OOOO
```

Onde:
- **NNNNNNN**: Número sequencial do processo (7 dígitos)
- **DD**: Dígito verificador (2 dígitos)
- **AAAA**: Ano de autuação (4 dígitos)
- **J**: Segmento da Justiça (1 dígito)
- **TT**: Tribunal (2 dígitos)
- **OOOO**: Origem (4 dígitos)

**Total**: 20 dígitos

**Exemplo**: `1234567-89.2024.8.16.0001`

## Scripts Disponíveis

### 1. Verificar Números de Processo (Dry-Run)

Este script verifica quais processos precisam ser normalizados **sem fazer alterações** no banco de dados.

```bash
cd apps/backend
npx tsx src/scripts/verificar-numeros-processo.ts
```

**Saída esperada:**
- Total de processos
- Processos já formatados corretamente
- Processos que precisam atualização (com exemplos)
- Processos com número inválido (menos de 20 dígitos)
- Estatísticas em percentual

### 2. Normalizar Números de Processo (Migração)

Este script normaliza todos os números de processo que não estão no formato CNJ.

⚠️ **ATENÇÃO**: Este script **modifica o banco de dados**. Execute primeiro o script de verificação!

```bash
cd apps/backend
npx tsx src/scripts/normalizar-numeros-processo.ts
```

**O que o script faz:**
1. Busca todos os processos no banco
2. Para cada processo:
   - Verifica se já está formatado → Pula
   - Verifica se tem 20 dígitos → Normaliza
   - Se tiver menos de 20 dígitos → Registra como inválido (não altera)
3. Exibe relatório final com:
   - Total de processos atualizados
   - Processos já formatados
   - Processos com erro
   - Processos inválidos

## Procedimento Recomendado

### 1. Backup do Banco de Dados

**SEMPRE** faça backup antes de executar a migração!

```bash
# PostgreSQL
pg_dump -U postgres advocacia_pitanga > backup_antes_migracao_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Executar Verificação

```bash
cd apps/backend
npx tsx src/scripts/verificar-numeros-processo.ts
```

Analise o resultado e confirme que os processos estão corretos.

### 3. Executar Migração

```bash
cd apps/backend
npx tsx src/scripts/normalizar-numeros-processo.ts
```

### 4. Verificar Resultado

Execute novamente o script de verificação para confirmar:

```bash
npx tsx src/scripts/verificar-numeros-processo.ts
```

O resultado deve mostrar que todos os processos válidos (com 20 dígitos) estão formatados.

### 5. Processos Inválidos

Se houver processos com menos de 20 dígitos, você precisará:

1. **Identificar os processos problemáticos** (o script lista todos)
2. **Corrigir manualmente no banco de dados** OU
3. **Deletar os processos** se forem dados de teste

**Exemplo de correção manual:**

```sql
-- Ver processo inválido
SELECT id, numero, cliente_id FROM processos WHERE LENGTH(REPLACE(numero, '-', '')) < 20;

-- Corrigir manualmente (se souber o número correto)
UPDATE processos SET numero = '1234567-89.2024.8.16.0001' WHERE id = 'id-do-processo';
```

## Comportamento Atual do Sistema

### Novos Processos

A partir da implementação atual, **todos os novos processos** são automaticamente salvos com a máscara CNJ aplicada.

Isso é feito em [processo.service.ts](../services/processo.service.ts) através do método `normalizarNumeroProcesso()`.

### Frontend

O frontend já aplica a máscara durante a digitação através da função `maskProcessoCNJ()` em [utils.ts](../../frontend/src/lib/utils.ts).

## Troubleshooting

### Erro: "Número de processo já cadastrado"

Se você tentar cadastrar um processo e receber esse erro, verifique se já existe um processo com o mesmo número (com ou sem máscara).

```sql
-- Buscar processo por número (ignora formatação)
SELECT * FROM processos
WHERE REPLACE(REPLACE(REPLACE(numero, '-', ''), '.', ''), ' ', '') = '12345678920248160001';
```

### Processo não aparece corretamente

Se um processo não aparece com a máscara no frontend, verifique:

1. O número está salvo corretamente no banco?
2. O frontend está usando `formatProcessoCNJ()` para exibir?

## Logs e Auditoria

A migração **não** cria registros de auditoria automaticamente. Se precisar rastrear as alterações, adicione logs manuais ou consulte o histórico do git.

## Rollback

Se precisar reverter a migração:

```bash
# PostgreSQL - restaurar backup
psql -U postgres advocacia_pitanga < backup_antes_migracao_20240610_143000.sql
```

## Suporte

Para dúvidas ou problemas, consulte:
- [Documentação do CNJ sobre numeração única](https://www.cnj.jus.br/programas-e-acoes/numeracao-unica/)
- Logs do sistema em `apps/backend/error.log`
