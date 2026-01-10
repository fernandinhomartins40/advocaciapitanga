# Migração de wkhtmltopdf para Puppeteer

## 📋 Resumo das Mudanças

Este documento descreve a migração do sistema de geração de PDF de **wkhtmltopdf** para **Puppeteer**, resolvendo os problemas de PDFs vazios e melhorando a qualidade da renderização.

## 🔄 Mudanças Realizadas

### 1. Dockerfile Backend (`apps/backend/Dockerfile`)

#### Antes (Alpine Linux):
```dockerfile
FROM node:18-alpine AS base
```

#### Depois (Debian Slim):
```dockerfile
FROM node:18-bookworm-slim AS base
```

**Motivo**: Alpine Linux usa `musl libc` em vez de `glibc`, causando incompatibilidade com o Chromium.

### 2. Dependências Docker

**Adicionadas**:
- `chromium` - Browser headless para Puppeteer
- `fonts-liberation`, `fonts-freefont-ttf` - Fontes para renderização
- Bibliotecas gráficas necessárias (libatk, libnss3, libx11, etc.)

**Variáveis de ambiente**:
```dockerfile
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### 3. PDFService (`apps/backend/src/services/pdf.service.ts`)

#### Migração Completa:
- ❌ Removido: `spawn` do wkhtmltopdf
- ✅ Adicionado: Puppeteer com Chromium

#### Melhorias:
- Renderização CSS moderna (100% compatível)
- JavaScript executado (SPAs funcionam)
- Qualidade superior de PDF
- Logs detalhados para debug

#### Flags do Chromium:
```javascript
[
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
  '--single-process',
  '--disable-breakpad'
]
```

## 🎯 Por Que a Migração?

### Problemas com wkhtmltopdf:
1. ❌ Projeto descontinuado/abandonado
2. ❌ PDFs vazios em Docker/Alpine
3. ❌ Requer `xvfb-run` (complexo)
4. ❌ CSS moderno limitado
5. ❌ Não estava instalado no Dockerfile

### Vantagens do Puppeteer:
1. ✅ Mantido ativamente pelo Google
2. ✅ CSS/HTML/JavaScript moderno
3. ✅ Alta qualidade de renderização
4. ✅ Ampla comunidade e suporte
5. ✅ Funciona perfeitamente em Debian

## 📊 Comparação Técnica

| Aspecto | wkhtmltopdf | Puppeteer |
|---------|-------------|-----------|
| **Status** | Descontinuado | Ativo (Google) |
| **Alpine Compat** | Problemas graves | ✅ Com Debian |
| **CSS Moderno** | Limitado | Completo |
| **JavaScript** | Não executa | Executa tudo |
| **Qualidade PDF** | Boa | Excelente |
| **Memória** | ~50-100MB | ~200-500MB |
| **Tamanho Docker** | +50MB | +450MB |
| **Startup** | 500ms | 2-5s |

## 🚀 Como Testar

### 1. Build da Imagem Docker

```bash
cd apps/backend
docker build -t advocacia-backend:latest -f Dockerfile ../../
```

### 2. Rodar Container

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  advocacia-backend:latest
```

### 3. Testar Exportação de PDF

#### Via API:
```bash
curl -X POST http://localhost:3001/api/ia/exportar-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conteudo": "<h1>Teste</h1><p>Conteúdo do documento</p>",
    "titulo": "Documento Teste"
  }' \
  --output teste.pdf
```

#### Via Interface:
1. Acesse a interface web
2. Crie ou abra um documento
3. Clique em "Exportar PDF"
4. Verifique se o PDF foi gerado corretamente

## 🔍 Logs e Debug

### Verificar Logs do Puppeteer:
```bash
docker logs <container_id> | grep "PDF"
```

### Logs Esperados:
```
[PDF] Iniciando Puppeteer executablePath=/usr/bin/chromium
[PDF] Carregando HTML na página
[PDF] Gerando PDF
[PDF] PDF gerado com sucesso duration_ms=2345
```

### Erros Comuns:

#### 1. "Chromium not found"
**Solução**: Verificar se a variável está correta:
```bash
docker exec -it <container_id> ls -la /usr/bin/chromium
```

#### 2. "Failed to launch browser"
**Solução**: Verificar flags do Chromium e permissões

#### 3. PDF vazio ou corrompido
**Solução**: Verificar HTML de entrada e logs detalhados

## 🔐 Segurança

### Flags de Segurança do Chromium:
- `--no-sandbox` - Necessário em Docker
- `--disable-setuid-sandbox` - Evita problemas de permissão
- `--single-process` - Isola processos

**IMPORTANTE**: Estas flags são seguras em ambientes containerizados, mas não recomendadas em ambientes de usuário final.

## 📈 Performance

### Métricas Esperadas:
- **Geração de PDF simples**: 1-3 segundos
- **Geração de PDF complexo**: 3-8 segundos
- **Uso de memória**: 200-500MB por operação
- **CPU**: 1-2 cores durante geração

### Otimizações Futuras:
1. Pool de browsers (reutilizar instâncias)
2. Cache de páginas frequentes
3. Fila de processamento para múltiplos PDFs
4. Serverless (AWS Lambda) para escalar

## 🐛 Troubleshooting

### Container não inicia:
```bash
# Verificar logs
docker logs <container_id>

# Verificar dependências
docker exec -it <container_id> dpkg -l | grep chromium
```

### PDF não gera:
```bash
# Testar Chromium manualmente
docker exec -it <container_id> chromium --version

# Verificar permissões
docker exec -it <container_id> ls -la /app/dist
```

### Memória insuficiente:
```bash
# Aumentar limite do Docker
docker run --memory=2g advocacia-backend:latest
```

## 🔄 Rollback

Se houver problemas, reverter para wkhtmltopdf:

```bash
git revert HEAD
docker build -t advocacia-backend:latest -f Dockerfile ../../
```

**Ou** instalar wkhtmltopdf no Dockerfile atual:
```dockerfile
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    xvfb \
    && rm -rf /var/lib/apt/lists/*
```

## 📚 Referências

- [Puppeteer Docs](https://pptr.dev/)
- [Puppeteer Docker Guide](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker)
- [Chromium Flags List](https://peter.sh/experiments/chromium-command-line-switches/)

## ✅ Checklist de Deploy

- [ ] Build Docker executado com sucesso
- [ ] Container inicia sem erros
- [ ] PDF gerado em ambiente local
- [ ] PDF gerado em ambiente de staging
- [ ] Performance dentro do esperado (< 5s)
- [ ] Memória dentro do limite (< 1GB)
- [ ] Testes de carga aprovados
- [ ] Rollback testado e funcional
- [ ] Deploy em produção
- [ ] Monitoramento ativo

## 📞 Suporte

Em caso de problemas:
1. Verificar logs detalhados
2. Testar Chromium manualmente no container
3. Consultar documentação do Puppeteer
4. Verificar issues conhecidas no GitHub

---

**Data da Migração**: 2026-01-10
**Versão**: 1.0.0
**Status**: ✅ Concluído
