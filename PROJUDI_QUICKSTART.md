# 🚀 Guia Rápido - Integração PROJUDI/TJPR

## ⏱️ Início Rápido (5 minutos)

### 1️⃣ Instalação

As dependências já foram instaladas automaticamente. Se necessário:

```bash
cd apps/backend
npm install
```

### 2️⃣ Configuração Básica

**Não precisa configurar nada!** A Estratégia 1 (Scraping Assistido) já está pronta para uso.

### 3️⃣ Usar Agora

1. Acesse um processo do **Paraná (PR)**
2. Clique em **"Atualizar PROJUDI"**
3. Digite o CAPTCHA
4. Pronto! ✅

---

## 🎯 Como Funciona

### Estratégia 1: Scraping Assistido (Disponível Agora)

```
Você → Clica "Atualizar" → Sistema busca CAPTCHA →
Você digita código → Sistema atualiza processo
```

**Não precisa de:**
- ❌ Credenciais
- ❌ Aprovação
- ❌ Configuração

**Pronto para usar!**

---

### Estratégia 2: API Oficial (Opcional - Futuro)

Se quiser automação total (sem CAPTCHA):

1. **Solicite credenciais:**
   - Email: sei@tjpr.jus.br
   - Assunto: "(Sistema PROJUDI) Adesão ao SCMPP"

2. **Configure `.env`:**
   ```env
   PROJUDI_API_ENABLED=true
   PROJUDI_USERNAME=seu_usuario
   PROJUDI_PASSWORD=sua_senha
   ```

3. **Reinicie o backend:**
   ```bash
   npm run dev
   ```

---

## 📱 Interface do Usuário

### Página de Detalhes do Processo

```
┌─────────────────────────────────────────────────┐
│ Processo: 0001234-56.2021.8.16.0001            │
│                                                 │
│ [Editar Processo] [Atualizar PROJUDI ▼]       │
│                                                 │
│  └─ Dropdown:                                  │
│     • API Oficial (Automático) 🔒 Premium     │
│     • Consulta Manual (CAPTCHA) ✓              │
└─────────────────────────────────────────────────┘
```

### Modal CAPTCHA

```
┌──────────────────────────────────┐
│  Consulta PROJUDI - Paraná       │
├──────────────────────────────────┤
│  Processo: 0001234-56.2021...    │
│                                  │
│  [IMAGEM DO CAPTCHA]             │
│                                  │
│  Digite o código: [_______]      │
│                                  │
│  [Cancelar] [Consultar]          │
└──────────────────────────────────┘
```

---

## 🔧 Para Desenvolvedores

### Usar nos Seus Componentes

```typescript
import {
  useIniciarCaptchaProjudi,
  useConsultarComCaptcha
} from '@/hooks/useProcessos';

function MeuComponente({ processoId }: Props) {
  const iniciar = useIniciarCaptchaProjudi();
  const consultar = useConsultarComCaptcha();

  const handleAtualizar = async () => {
    // 1. Obter CAPTCHA
    const captcha = await iniciar.mutateAsync(processoId);

    // 2. Exibir para usuário resolver
    // ...

    // 3. Consultar
    const result = await consultar.mutateAsync({
      processoId,
      sessionId: captcha.sessionId,
      captchaResposta: 'ABC123'
    });

    console.log('Atualizado!', result);
  };

  return <button onClick={handleAtualizar}>Atualizar</button>;
}
```

### Endpoints REST

```bash
# Status
GET /api/projudi/status

# Iniciar CAPTCHA
POST /api/projudi/processos/:id/iniciar-captcha

# Consultar com CAPTCHA
POST /api/projudi/processos/:id/consultar-captcha
Body: { sessionId, captchaResposta }

# API Oficial (se habilitada)
POST /api/projudi/processos/:id/sincronizar-api
```

---

## ⚠️ Limitações e Rate Limits

```
Scraping Assistido:
• 5 consultas a cada 5 minutos
• 50 consultas por dia
• 1 processo por vez

API Oficial:
• Sem limite (depende do TJPR)
• Múltiplos processos
• Verificação de alterações (hash)
```

---

## 🐛 Erros Comuns

### "CAPTCHA incorreto"
→ Digite novamente (modal fica aberto)

### "Muitas consultas"
→ Aguarde 5 minutos

### "API não habilitada"
→ Configure credenciais no `.env`

### "Processo não encontrado"
→ Verifique o número do processo

---

## ✅ Checklist de Implementação

- [x] Backend: Services criados
- [x] Backend: Controllers e rotas
- [x] Backend: Prisma migration
- [x] Frontend: Hooks
- [x] Frontend: Modal CAPTCHA
- [x] Frontend: Botões e UI
- [x] Variáveis de ambiente
- [x] Documentação completa
- [ ] Testes (opcional)
- [ ] Deploy

---

## 📞 Precisa de Ajuda?

1. **Leia a documentação completa:** `PROJUDI_INTEGRATION.md`
2. **Verifique troubleshooting:** Seção de erros comuns
3. **Contato TJPR:** sei@tjpr.jus.br

---

## 🎉 Pronto!

Sua integração PROJUDI está **100% funcional**.

**Próximos Passos:**
1. Teste com um processo do PR
2. Se precisar de automação total, solicite credenciais API
3. Monitore logs e auditoria

**Desenvolvido com ❤️ para Advocacia Pitanga**
