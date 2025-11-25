# 🚀 Deploy - Guia Rápido

Guia resumido para fazer deploy da Advocacia Pitanga em produção.

## ⚡ Setup em 5 Minutos

### 1️⃣ Configurar GitHub Secrets

No GitHub, vá em `Settings → Secrets → Actions` e adicione:

- **VPS_PASSWORD**: Senha SSH da VPS (72.60.10.112)
- **OPENAI_API_KEY**: Chave da OpenAI (opcional)

### 2️⃣ Configurar DNS

Aponte os domínios para a VPS:

```
advocaciapitanga.com.br     → 72.60.10.112
www.advocaciapitanga.com.br → 72.60.10.112
```

### 3️⃣ Setup da VPS (Primeira vez)

```bash
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh
```

### 4️⃣ Deploy

**Opção A - Automático (Recomendado):**
```bash
git push origin main
```

**Opção B - Manual:**
```bash
chmod +x scripts/deploy-manual.sh
./scripts/deploy-manual.sh
```

### 5️⃣ Configurar SSL (Na VPS)

```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
chmod +x scripts/ssl-setup.sh
./scripts/ssl-setup.sh
```

## ✅ Pronto!

Acesse:
- https://advocaciapitanga.com.br
- https://www.advocaciapitanga.com.br

---

## 🔧 Comandos Úteis

### Ver logs
```bash
./scripts/logs.sh
```

### Ver status
```bash
./scripts/status.sh
```

### Reiniciar aplicação
```bash
ssh root@72.60.10.112
cd /root/advocaciapitanga
docker-compose -f docker-compose.vps.yml restart
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte [DEPLOY.md](DEPLOY.md)

---

## 🆘 Problemas?

1. **Aplicação não responde?**
   ```bash
   ./scripts/status.sh
   ./scripts/logs.sh
   ```

2. **SSL não funciona?**
   - Verifique se DNS propagou: `dig advocaciapitanga.com.br`
   - Execute novamente: `./scripts/ssl-setup.sh` (na VPS)

3. **Deploy falhou?**
   - Verifique GitHub Actions em `Actions` no repositório
   - Veja logs do workflow para identificar o erro

---

## 📊 Arquitetura Rápida

```
Internet (HTTPS)
    ↓
Nginx VPS (porta 443/80)
    ↓
Container (porta 3190)
    ├─ Nginx interno
    ├─ Frontend (Next.js)
    ├─ Backend (Node.js)
    └─ PostgreSQL
```

**Porta exposta**: 3190
**Domínios**: advocaciapitanga.com.br, www.advocaciapitanga.com.br
**VPS**: 72.60.10.112
