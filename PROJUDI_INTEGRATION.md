# 🏛️ Integração PROJUDI/TJPR - Sistema Híbrido

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Estratégias Implementadas](#estratégias-implementadas)
- [Como Usar](#como-usar)
- [Configuração](#configuração)
- [Arquitetura Técnica](#arquitetura-técnica)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Considerações Legais](#considerações-legais)

---

## 🎯 Visão Geral

Este sistema implementa **duas estratégias distintas e independentes** para atualizar processos judiciais do Tribunal de Justiça do Paraná (TJPR) através do PROJUDI:

1. **Estratégia 1: Scraping Assistido por Humano** - Disponível imediatamente
2. **Estratégia 2: API Oficial SCMPP** - Requer credenciais do TJPR

### ✅ Funcionalidades

- ✅ Atualização automática de dados processuais públicos
- ✅ Extração de partes processuais
- ✅ Histórico de movimentações
- ✅ Dados de localização judicial (comarca, vara, foro)
- ✅ Status e datas do processo
- ✅ Valor da causa
- ✅ Auditoria completa de consultas
- ✅ Rate limiting para uso responsável

---

## ⚙️ Estratégias Implementadas

### 🤝 Estratégia 1: Scraping Assistido por Humano

**Como funciona:**
1. Sistema acessa a consulta pública do PROJUDI
2. Captura imagem do CAPTCHA
3. Exibe CAPTCHA para o usuário resolver
4. Usuário digita o código manualmente
5. Sistema consulta e extrai dados públicos
6. Atualiza o processo automaticamente

**Vantagens:**
- ✅ Disponível imediatamente (sem burocracia)
- ✅ Não requer credenciais ou aprovação
- ✅ 100% legal e ético
- ✅ Consulta dados públicos oficiais

**Limitações:**
- ⚠️ Requer interação humana (CAPTCHA)
- ⚠️ Uma consulta por vez
- ⚠️ Rate limit: 5 consultas por 5 minutos

**Quando usar:**
- Pequenos escritórios / advogados autônomos
- Atualização pontual de processos
- Não possui credenciais SCMPP

---

### ⚡ Estratégia 2: API Oficial SCMPP

**Como funciona:**
1. Sistema se conecta via SOAP/XML com TJPR
2. Envia credenciais de autenticação
3. Consulta processo via MNI 2.2.2 (Modelo Nacional de Interoperabilidade)
4. Recebe dados estruturados
5. Atualiza processo automaticamente

**Vantagens:**
- ✅ Totalmente automatizado (sem CAPTCHA)
- ✅ Permite sincronização em lote
- ✅ Verificação de alterações (hash)
- ✅ Dados estruturados (XML/MNI)
- ✅ API oficial e estável

**Limitações:**
- ⚠️ Requer credenciais oficiais do TJPR
- ⚠️ Processo de aprovação pode levar semanas
- ⚠️ Apenas dados públicos (conforme MNI)

**Quando usar:**
- Médios e grandes escritórios
- Sincronização automatizada
- Alto volume de processos
- Possui credenciais SCMPP

---

## 🚀 Como Usar

### Para Usuários (Frontend)

#### 1. Acessar Detalhes do Processo

Navegue até: **Processos → [Selecione um processo do PR]**

#### 2. Atualizar Processo

Você verá o botão **"Atualizar PROJUDI"** (apenas para processos do Paraná - UF: PR).

##### Opção A: Automático (se API estiver habilitada)

Clique em **"Atualizar PROJUDI"** - o sistema usará a API oficial automaticamente.

##### Opção B: Manual (Scraping Assistido)

1. Clique na **seta ao lado** do botão "Atualizar PROJUDI"
2. Selecione **"Consulta Manual (CAPTCHA)"**
3. **Aguarde** o CAPTCHA carregar
4. **Digite o código** exibido na imagem
5. Clique em **"Consultar"**
6. Aguarde a atualização

#### 3. Campos Atualizados

Após a atualização bem-sucedida, você verá:
- Toast de sucesso com número de campos atualizados
- Dados do processo automaticamente atualizados na tela
- Registro na auditoria

---

### Para Desenvolvedores (Backend)

#### Endpoints Disponíveis

```typescript
// Verificar status da integração
GET /api/projudi/status

// ESTRATÉGIA 1: Iniciar consulta com CAPTCHA
POST /api/projudi/processos/:id/iniciar-captcha

// ESTRATÉGIA 1: Consultar com CAPTCHA resolvido
POST /api/projudi/processos/:id/consultar-captcha
Body: { sessionId: string, captchaResposta: string }

// ESTRATÉGIA 2: Sincronizar via API oficial
POST /api/projudi/processos/:id/sincronizar-api

// Verificar alterações (hash)
GET /api/projudi/processos/:id/verificar-alteracoes

// Testar configuração
GET /api/projudi/testar
```

#### Exemplo de Uso (React/TypeScript)

```typescript
import {
  useIniciarCaptchaProjudi,
  useConsultarComCaptcha,
  useSincronizarViaAPI
} from '@/hooks/useProcessos';

function MeuComponente({ processoId }: { processoId: string }) {
  const iniciarCaptcha = useIniciarCaptchaProjudi();
  const consultarCaptcha = useConsultarComCaptcha();
  const sincronizarAPI = useSincronizarViaAPI();

  // Scraping Assistido
  const handleScrapingAssistido = async () => {
    // 1. Iniciar e obter CAPTCHA
    const { sessionId, captchaImage } = await iniciarCaptcha.mutateAsync(processoId);

    // 2. Exibir CAPTCHA para usuário
    // 3. Usuário resolve e retorna resposta
    const captchaResposta = 'ABC123'; // Exemplo

    // 4. Consultar com resposta
    const resultado = await consultarCaptcha.mutateAsync({
      processoId,
      sessionId,
      captchaResposta
    });

    console.log('Campos atualizados:', resultado.camposAtualizados);
  };

  // API Oficial
  const handleAPIOficial = async () => {
    const resultado = await sincronizarAPI.mutateAsync(processoId);
    console.log('Sincronizado com sucesso!', resultado);
  };

  return (
    <>
      <button onClick={handleScrapingAssistido}>
        Atualizar Manual (CAPTCHA)
      </button>
      <button onClick={handleAPIOficial}>
        Atualizar Automático (API)
      </button>
    </>
  );
}
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# ====================
# PROJUDI / TJPR
# ====================

# ESTRATÉGIA 1: Scraping Assistido (sempre habilitado)
# Não requer configuração

# ESTRATÉGIA 2: API Oficial SCMPP (opcional)
PROJUDI_API_ENABLED=false
PROJUDI_AMBIENTE=homologacao
PROJUDI_INSTANCIA=primeira
PROJUDI_USERNAME=
PROJUDI_PASSWORD=
```

### 2. Habilitar API Oficial (Opcional)

#### Passo 1: Solicitar Credenciais

Envie email para: **sei@tjpr.jus.br**

**Assunto:** "(Sistema PROJUDI) Adesão ao SCMPP"

**Documentos necessários:**
- Resolução nº 216/2019 preenchida e assinada
- CNPJ da empresa ou OAB do escritório
- Documentos de identificação

#### Passo 2: Configurar Credenciais

Após receber as credenciais do TJPR:

```env
PROJUDI_API_ENABLED=true
PROJUDI_AMBIENTE=producao
PROJUDI_INSTANCIA=primeira
PROJUDI_USERNAME=seu_usuario
PROJUDI_PASSWORD=sua_senha
```

#### Passo 3: Testar Configuração

```bash
# Via API
curl http://localhost:3001/api/projudi/testar

# Ou via interface
# Processos → [Processo PR] → "Atualizar PROJUDI" → Dropdown → "API Oficial"
```

---

## 🏗️ Arquitetura Técnica

### Backend

```
apps/backend/src/
├── services/
│   ├── projudi-scraper.service.ts    # Estratégia 1 (Scraping)
│   └── projudi-api.service.ts        # Estratégia 2 (API SOAP)
├── controllers/
│   └── projudi.controller.ts         # Endpoints REST
└── routes/
    └── projudi.routes.ts             # Rotas + Rate Limiting
```

### Frontend

```
apps/frontend/src/
├── components/processos/
│   └── ModalCaptchaProjudi.tsx       # Modal de CAPTCHA
├── hooks/
│   └── useProcessos.ts               # Hooks de integração
└── app/advogado/processos/[id]/
    └── page.tsx                      # Página com botões
```

### Database

```prisma
model ConsultaProjudi {
  id             String          @id @default(cuid())
  processoId     String
  metodo         MetodoConsulta  // API_OFICIAL ou SCRAPING_ASSISTIDO
  status         StatusConsulta  // SUCESSO, ERRO_CAPTCHA, etc.
  dadosExtraidos Json?
  userId         String
  createdAt      DateTime
}
```

---

## 📚 API Reference

### GET /api/projudi/status

Retorna status da integração PROJUDI.

**Response:**
```json
{
  "scraper": {
    "enabled": true,
    "disponivel": true,
    "metodo": "SCRAPING_ASSISTIDO"
  },
  "api": {
    "enabled": false,
    "disponivel": false,
    "metodo": "API_OFICIAL",
    "mensagem": "API não está habilitada"
  }
}
```

### POST /api/projudi/processos/:id/iniciar-captcha

Inicia consulta e retorna CAPTCHA.

**Response:**
```json
{
  "sessionId": "uuid-v4",
  "captchaImage": "data:image/png;base64,iVBOR...",
  "numeroProcesso": "0001234-56.2021.8.16.0001"
}
```

### POST /api/projudi/processos/:id/consultar-captcha

Consulta processo com CAPTCHA resolvido.

**Request:**
```json
{
  "sessionId": "uuid-v4",
  "captchaResposta": "ABC123"
}
```

**Response:**
```json
{
  "sucesso": true,
  "processo": { /* dados atualizados */ },
  "dadosExtraidos": {
    "numero": "0001234-56.2021.8.16.0001",
    "comarca": "Curitiba",
    "vara": "1ª Vara Cível",
    "partes": [...]
  },
  "camposAtualizados": ["comarca", "vara", "status", "valorCausa"]
}
```

### POST /api/projudi/processos/:id/sincronizar-api

Sincroniza via API oficial (requer credenciais).

**Response:**
```json
{
  "sucesso": true,
  "processo": { /* dados atualizados */ },
  "dadosExtraidos": { /* dados MNI */ },
  "camposAtualizados": [...]
}
```

---

## 🐛 Troubleshooting

### Erro: "CAPTCHA incorreto"

**Causa:** Usuário digitou código errado.

**Solução:** Tente novamente. O modal permanece aberto para nova tentativa.

### Erro: "Sessão expirada"

**Causa:** CAPTCHA válido por 15 minutos.

**Solução:** Clique novamente em "Atualizar PROJUDI" para obter novo CAPTCHA.

### Erro: "Muitas consultas ao PROJUDI"

**Causa:** Rate limit atingido (5 consultas / 5 minutos).

**Solução:** Aguarde alguns minutos antes de tentar novamente.

### Erro: "API PROJUDI não está habilitada"

**Causa:** Tentou usar API oficial sem configurar credenciais.

**Solução:**
1. Configure `PROJUDI_API_ENABLED=true` no `.env`
2. Adicione credenciais `PROJUDI_USERNAME` e `PROJUDI_PASSWORD`
3. Reinicie o backend

### Erro: "Processo não encontrado"

**Causa:** Número do processo não existe no PROJUDI ou está incorreto.

**Solução:** Verifique se o número do processo está correto e no formato CNJ.

### Erro de Puppeteer (Linux/Docker)

**Causa:** Faltam dependências do Chrome.

**Solução:**
```bash
# Ubuntu/Debian
apt-get update && apt-get install -y \
  chromium-browser \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxi6 \
  libxtst6 \
  libnss3 \
  libcups2 \
  libxss1 \
  libxrandr2 \
  libasound2 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libgtk-3-0
```

---

## ⚖️ Considerações Legais

### ✅ O Que É Permitido

1. **Consulta de Dados Públicos:** Acesso a informações disponíveis publicamente
2. **Uso Profissional:** Advogados consultando processos sob sua responsabilidade
3. **Interação Humana:** CAPTCHA resolvido por pessoa (não automatizado)
4. **Uso Interno:** Dados usados apenas internamente pelo escritório

### ❌ O Que NÃO É Permitido

1. **Quebra Automática de CAPTCHA:** Uso de OCR, IA ou serviços third-party
2. **Consultas em Massa:** Requisições automatizadas sem controle
3. **Acesso a Processos Sigilosos:** Tentativa de acessar dados restritos
4. **Comercialização:** Venda ou distribuição dos dados extraídos
5. **Burlar Rate Limits:** Uso de múltiplos IPs ou proxies

### 📋 Conformidade

- ✅ **LGPD:** Apenas dados processuais públicos (não pessoais sensíveis)
- ✅ **CF/88 Art. 93, IX:** Publicidade dos atos processuais
- ✅ **Resolução TJPR nº 216/2019:** SCMPP para consultas automatizadas
- ✅ **Código de Ética OAB:** Uso profissional legítimo

---

## 📞 Suporte

### Contatos TJPR

- **Email:** sei@tjpr.jus.br
- **Assunto:** "(Sistema PROJUDI) Adesão ao SCMPP"
- **Documentação:** https://www.tjpr.jus.br/acesso-automatizado

### Documentação Técnica

- **MNI (CNJ):** https://www.cnj.jus.br/modelo-nacional-de-interoperabilidade/
- **PROJUDI/TJPR:** https://consulta.tjpr.jus.br/projudi_consulta/

---

## 🔄 Changelog

### v1.0.0 (2025-01-27)

- ✅ Implementação completa das duas estratégias
- ✅ Interface com dropdown de seleção
- ✅ Modal CAPTCHA responsivo
- ✅ Rate limiting e segurança
- ✅ Auditoria completa
- ✅ Documentação técnica

---

## 📄 Licença

Este código é de uso exclusivo do sistema Advocacia Pitanga.

**Desenvolvido por:** Claude (Anthropic) + Equipe Advocacia Pitanga
**Data:** Janeiro de 2025
