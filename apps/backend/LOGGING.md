# 📋 Sistema de Logging e Monitoramento

## 🎯 Visão Geral

Este documento descreve o sistema de logging robusto implementado na aplicação Advocacia Pitanga Backend, seguindo as melhores práticas de 2025 da comunidade Node.js/TypeScript.

## 🚀 Tecnologias Utilizadas

### Pino Logger
- **Performance**: 5x mais rápido que Winston
- **Logs estruturados**: JSON por padrão
- **Low overhead**: Mínimo impacto em CPU/memória
- **Pretty printing**: Logs coloridos em desenvolvimento

### Sentry
- **Error tracking**: Captura automática de exceções
- **Performance monitoring**: APM e tracing de requisições
- **Profiling**: Análise de CPU e memória
- **Alertas**: Notificações em tempo real

### Sistema de Métricas
- **Contadores**: Eventos acumulativos
- **Gauges**: Valores que sobem/descem
- **Histogramas**: Distribuições (latência, etc)
- **Timers**: Medição de duração

## 📁 Estrutura de Arquivos

```
apps/backend/src/
├── utils/
│   ├── logger.ts              # Sistema de logging com Pino
│   ├── error-tracker.ts       # Integração com Sentry
│   └── metrics.ts             # Coleta de métricas
├── middlewares/
│   ├── request-id.middleware.ts    # Request ID único
│   ├── http-logger.middleware.ts   # Logging HTTP
│   └── error.middleware.ts         # Tratamento de erros
└── services/
    └── *.service.ts           # Services com logging contextual
```

## 🔧 Configuração

### Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```bash
# Nível de log (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# Versão da aplicação
APP_VERSION=1.0.0

# Sentry - Error Tracking
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0

# Métricas - Intervalo em ms (0 = desabilitado)
METRICS_INTERVAL=60000
```

### Obter DSN do Sentry

1. Acesse https://sentry.io
2. Crie uma conta ou faça login
3. Crie um novo projeto Node.js
4. Copie a DSN fornecida
5. Cole no `.env` como `SENTRY_DSN`

## 📝 Como Usar

### 1. Logger Básico

```typescript
import { logger } from '../utils/logger';

// Log simples
logger.info('Servidor iniciado');
logger.error('Erro ao processar requisição');

// Log estruturado (formato Pino)
logger.info({
  msg: 'Usuário autenticado',
  userId: '123',
  email: 'user@example.com',
});
```

### 2. Logger com Contexto (Child Logger)

```typescript
import { createContextLogger } from '../utils/logger';

class UserService {
  private logger = createContextLogger({ service: 'UserService' });

  async createUser(data: any) {
    this.logger.info({ msg: 'Criando usuário', email: data.email });
    // ...
  }
}
```

### 3. Logger de Requisição HTTP

```typescript
// O middleware já adiciona automaticamente
// Acesse via req.logger nos controllers

export const getUserController = async (req: Request, res: Response) => {
  const logger = (req as any).logger;

  logger.info({ msg: 'Buscando usuário', userId: req.params.id });
  // ...
};
```

### 4. Medição de Tempo

```typescript
import { startTimer, logger } from '../utils/logger';

async function processData() {
  const timer = startTimer();

  // Processar dados...
  await heavyOperation();

  const duration = timer();
  logger.info({ msg: 'Dados processados', duration_ms: duration });
}
```

### 5. Log de Erros Estruturado

```typescript
import { logError, logger } from '../utils/logger';

try {
  await riskyOperation();
} catch (error) {
  logError(logger, 'Operação falhou', error, {
    operationId: '123',
    userId: '456',
  });
  throw error;
}
```

### 6. Logger de Auditoria

```typescript
import { auditLogger } from '../utils/logger';

// Logs críticos que devem ser preservados
auditLogger.info({
  msg: 'Documento excluído',
  documentId: '123',
  userId: '456',
  ip: req.ip,
});
```

### 7. Métricas

```typescript
import { metrics } from '../utils/metrics';

// Incrementar contador
metrics.increment('api.requests.total');
metrics.increment('api.errors', 1, { statusCode: '500' });

// Definir gauge
metrics.gauge('database.connections.active', 10);

// Timer automático
const timer = metrics.timer('database.query.duration.ms');
await executeQuery();
timer(); // Registra automaticamente

// Histograma manual
metrics.histogram('response.size.bytes', responseSize);
```

### 8. Captura Manual no Sentry

```typescript
import { captureException, captureMessage } from '../utils/error-tracker';

try {
  await criticalOperation();
} catch (error) {
  captureException(error, {
    extra: {
      operationId: '123',
      userId: '456',
    },
  });
  throw error;
}

// Mensagens importantes (não erros)
captureMessage('Limite de quota atingido', 'warning');
```

## 🏗️ Arquitetura

### Fluxo de Requisição

```
1. Request ID Middleware
   └─> Adiciona UUID único à requisição

2. HTTP Logger Middleware
   └─> Cria logger contextual
   └─> Anexa req.logger
   └─> Loga início da requisição

3. Metrics Middleware
   └─> Inicia timer
   └─> Conta requisições
   └─> Mede duração

4. Controllers/Services
   └─> Usam req.logger ou service logger
   └─> Logs estruturados com contexto

5. Response
   └─> HTTP Logger loga resposta
   └─> Metrics registra métricas
   └─> Request ID no header

6. Error Middleware (se erro)
   └─> Log estruturado do erro
   └─> Captura no Sentry
   └─> Resposta ao cliente
```

### Níveis de Log

```typescript
logger.trace({ msg: '...' }); // Muito detalhado
logger.debug({ msg: '...' }); // Debug (dev only)
logger.info({ msg: '...' });  // Informação geral
logger.warn({ msg: '...' });  // Avisos
logger.error({ msg: '...' }); // Erros
logger.fatal({ msg: '...' }); // Erros críticos
```

### Redação de Dados Sensíveis

O logger automaticamente remove dados sensíveis dos logs:

- Senhas (`password`, `senha`)
- Tokens (`token`, `authorization`)
- CPF, CNPJ, RG
- Emails
- Cookies
- Headers de autenticação

## 📊 Métricas Automáticas

O sistema coleta automaticamente:

### HTTP
- `http.requests.total` - Total de requisições
- `http.errors.total` - Total de erros
- `http.request.duration.ms` - Duração das requisições

### Sistema
- `system.memory.heap_used.bytes` - Memória heap usada
- `system.memory.heap_total.bytes` - Memória heap total
- `system.memory.rss.bytes` - Memória RSS
- `system.uptime.seconds` - Uptime do processo

## 🔍 Debugging

### Desenvolvimento

```bash
# Logs coloridos e formatados
LOG_LEVEL=debug npm run dev
```

### Produção

```bash
# Logs em JSON
LOG_LEVEL=info npm start
```

### Análise de Logs

```bash
# Filtrar por nível
cat logs/combined.log | grep '"level":"error"'

# Filtrar por requestId
cat logs/combined.log | grep 'abc-123-def'

# Contar erros
cat logs/combined.log | grep '"level":"error"' | wc -l

# Pretty print JSON
cat logs/combined.log | jq '.'
```

## 🎯 Melhores Práticas

### ✅ Faça

```typescript
// Log estruturado com contexto
logger.info({
  msg: 'Operação concluída',
  userId: user.id,
  duration_ms: 150,
  success: true,
});

// Use child loggers para contexto compartilhado
const userLogger = logger.child({ userId: '123' });
userLogger.info('Ação 1');
userLogger.info('Ação 2');

// Meça performance de operações críticas
const timer = startTimer();
await operation();
logger.info({ msg: 'Operação', duration_ms: timer() });
```

### ❌ Não Faça

```typescript
// Logs não estruturados
logger.info('User 123 completed operation in 150ms');

// Logs de dados sensíveis
logger.info({ password: user.password }); // ❌ NUNCA!

// Logs excessivos em loops
for (let i = 0; i < 10000; i++) {
  logger.debug(`Processing ${i}`); // ❌ Overhead!
}

// Concatenação de strings
logger.info('Error: ' + error.message); // Use objeto!
```

## 🚨 Troubleshooting

### Logs não aparecem

1. Verifique `LOG_LEVEL` no `.env`
2. Em produção, use `info` ou superior
3. Verifique se o serviço está rodando

### Sentry não captura erros

1. Verifique `SENTRY_DSN` no `.env`
2. Verifique conexão com internet
3. Veja logs de inicialização do Sentry
4. Use `captureException` manualmente para testar

### Métricas não são logadas

1. Verifique `METRICS_INTERVAL` > 0
2. Aguarde o intervalo configurado
3. Verifique logs com `grep metrics`

## 📈 Integração com Ferramentas

### Datadog

```typescript
// Adicione transport custom para Datadog
import pino from 'pino';

const logger = pino({
  // ... config
  transport: {
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
    }
  }
});
```

### Elasticsearch/Logstash

```bash
# Envie logs JSON para Logstash
tail -f logs/combined.log | logstash -f logstash.conf
```

### Grafana/Prometheus

```typescript
// Exporte métricas no formato Prometheus
import { metrics } from './utils/metrics';

app.get('/metrics', (req, res) => {
  const data = metrics.getMetrics();
  // Converter para formato Prometheus
  res.send(formatPrometheus(data));
});
```

## 🎓 Recursos Adicionais

- [Documentação Pino](https://getpino.io/)
- [Documentação Sentry](https://docs.sentry.io/platforms/node/)
- [Best Practices - Better Stack](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte este documento
2. Verifique os logs em `logs/`
3. Verifique o Sentry dashboard
4. Entre em contato com a equipe de desenvolvimento
