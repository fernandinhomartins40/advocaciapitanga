# ✅ Checklist de Deploy - Advocacia Pitanga

Use este checklist para garantir que todos os passos do deploy foram executados corretamente.

## 📋 Pré-Deploy

### Configuração GitHub

- [ ] Repositório criado no GitHub
- [ ] Código commitado e pushed
- [ ] Secret `VPS_PASSWORD` configurado em Settings → Secrets → Actions
- [ ] Secret `OPENAI_API_KEY` configurado (opcional)

### Configuração DNS

- [ ] Registro A para `advocaciapitanga.com.br` → `72.60.10.112` criado
- [ ] Registro A para `www.advocaciapitanga.com.br` → `72.60.10.112` criado
- [ ] Propagação DNS verificada:
  ```bash
  dig advocaciapitanga.com.br
  dig www.advocaciapitanga.com.br
  ```
- [ ] Ambos os domínios resolvem para `72.60.10.112`

### Configuração VPS

- [ ] Acesso SSH à VPS funcional:
  ```bash
  ssh root@72.60.10.112
  ```
- [ ] Script de setup executado:
  ```bash
  chmod +x scripts/setup-vps.sh
  ./scripts/setup-vps.sh
  ```
- [ ] Docker instalado e funcionando:
  ```bash
  docker --version
  docker-compose --version
  ```
- [ ] Nginx instalado e rodando:
  ```bash
  systemctl status nginx
  ```
- [ ] Certbot instalado:
  ```bash
  certbot --version
  ```
- [ ] Firewall configurado (portas 22, 80, 443, 3190):
  ```bash
  ufw status
  ```

## 🚀 Primeiro Deploy

### Deploy Automático (Recomendado)

- [ ] Workflow GitHub Actions presente em `.github/workflows/deploy-vps.yml`
- [ ] Push para branch main executado:
  ```bash
  git push origin main
  ```
- [ ] Workflow executado com sucesso (verificar em Actions no GitHub)
- [ ] Todos os steps do workflow completados sem erros
- [ ] Health check passou ao final do workflow

### OU Deploy Manual

- [ ] Script de deploy manual executado:
  ```bash
  chmod +x scripts/deploy-manual.sh
  ./scripts/deploy-manual.sh
  ```
- [ ] Código sincronizado com VPS via rsync
- [ ] Imagens Docker construídas sem erros
- [ ] Containers iniciados corretamente
- [ ] Health check passou

## 🔍 Verificação Pós-Deploy

### Containers

Na VPS, verificar:

- [ ] Container `advocacia-vps` rodando:
  ```bash
  docker ps | grep advocacia-vps
  ```
- [ ] Container `advocacia-postgres` rodando:
  ```bash
  docker ps | grep advocacia-postgres
  ```
- [ ] Status dos containers OK:
  ```bash
  cd /root/advocaciapitanga
  docker-compose -f docker-compose.vps.yml ps
  ```

### Health Checks

- [ ] Health check interno OK:
  ```bash
  curl http://localhost:3190/health
  ```
- [ ] Resposta esperada:
  ```json
  {"status":"ok","service":"advocacia-pitanga"}
  ```

### Aplicação

- [ ] Frontend acessível via IP:
  ```bash
  curl -I http://72.60.10.112:3190
  ```
- [ ] API respondendo:
  ```bash
  curl -I http://72.60.10.112:3190/api/health
  ```

### Logs

- [ ] Logs do backend sem erros:
  ```bash
  docker logs advocacia-vps --tail=50
  ```
- [ ] Logs do PostgreSQL sem erros:
  ```bash
  docker logs advocacia-postgres --tail=20
  ```
- [ ] Nginx rodando corretamente:
  ```bash
  nginx -t
  systemctl status nginx
  ```

## 🔒 Configuração SSL

### Pré-requisitos SSL

- [ ] Aplicação rodando corretamente
- [ ] DNS propagado completamente (pode levar até 48h)
- [ ] Porta 80 e 443 acessíveis externamente

### Executar SSL Setup

Na VPS:

- [ ] Conectado à VPS:
  ```bash
  ssh root@72.60.10.112
  cd /root/advocaciapitanga
  ```
- [ ] Script SSL executado:
  ```bash
  chmod +x scripts/ssl-setup.sh
  ./scripts/ssl-setup.sh
  ```
- [ ] Email fornecido para Let's Encrypt
- [ ] Certificados obtidos com sucesso
- [ ] Nginx recarregado com configuração SSL
- [ ] Renovação automática configurada

### Verificação SSL

- [ ] HTTPS funcionando:
  ```bash
  curl -I https://advocaciapitanga.com.br
  curl -I https://www.advocaciapitanga.com.br
  ```
- [ ] HTTP redireciona para HTTPS automaticamente
- [ ] Certificado válido (sem avisos no navegador)
- [ ] Teste de renovação OK:
  ```bash
  certbot renew --dry-run
  ```

## 🧪 Testes Finais

### Frontend

- [ ] Site principal carrega: https://advocaciapitanga.com.br
- [ ] WWW funciona: https://www.advocaciapitanga.com.br
- [ ] Imagens e assets carregam
- [ ] Navegação funciona
- [ ] Formulários submetem
- [ ] Sem erros no console do navegador

### Backend API

- [ ] Endpoint de health funciona:
  ```bash
  curl https://advocaciapitanga.com.br/api/health
  ```
- [ ] Login funciona
- [ ] CORS configurado corretamente
- [ ] Upload de arquivos funciona
- [ ] Rotas protegidas retornam 401 sem autenticação

### Banco de Dados

- [ ] Migrations executadas:
  ```bash
  docker exec advocacia-vps npx prisma migrate status
  ```
- [ ] Conexão com banco OK
- [ ] Dados sendo persistidos corretamente
- [ ] Volume `postgres_data` criado e funcionando

### Performance

- [ ] Tempo de resposta < 1s para páginas
- [ ] API responde em < 500ms
- [ ] Sem memory leaks (verificar após 1h rodando):
  ```bash
  docker stats --no-stream
  ```

## 📊 Monitoramento Contínuo

### Diário

- [ ] Verificar logs:
  ```bash
  ./scripts/logs.sh
  ```
- [ ] Verificar status:
  ```bash
  ./scripts/status.sh
  ```
- [ ] Health check OK

### Semanal

- [ ] Backup do banco de dados:
  ```bash
  docker exec advocacia-postgres pg_dump -U advocacia advocacia_pitanga > backup-$(date +%Y%m%d).sql
  ```
- [ ] Verificar espaço em disco:
  ```bash
  df -h
  ```
- [ ] Limpar Docker (se necessário):
  ```bash
  docker system prune -f
  ```

### Mensal

- [ ] Verificar renovação SSL:
  ```bash
  certbot certificates
  ```
- [ ] Atualizar sistema:
  ```bash
  apt update && apt upgrade -y
  ```
- [ ] Revisar logs de erros
- [ ] Verificar uso de recursos (CPU, RAM, Disco)

## 🆘 Troubleshooting

Se algo falhar, consulte:

1. **[DEPLOY.md](DEPLOY.md)** - Seção Troubleshooting
2. **Scripts de diagnóstico**:
   ```bash
   ./scripts/status.sh  # Status completo
   ./scripts/logs.sh    # Logs em tempo real
   ```
3. **Logs diretos**:
   ```bash
   docker logs advocacia-vps --tail=100
   docker logs advocacia-postgres --tail=50
   journalctl -u nginx -f
   ```

## 📝 Notas

- ✅ = Concluído
- 🔄 = Em progresso
- ❌ = Falhou
- ⏭️ = Pulado (opcional)

---

## 🎉 Deploy Completo!

Quando todos os itens estiverem ✅, seu deploy está 100% funcional!

**URLs em Produção:**
- Frontend: https://advocaciapitanga.com.br
- API: https://advocaciapitanga.com.br/api
- Health: https://advocaciapitanga.com.br/health

**Comandos Úteis:**
```bash
# Ver logs
./scripts/logs.sh

# Ver status
./scripts/status.sh

# Novo deploy
git push origin main

# Reiniciar app (na VPS)
cd /root/advocaciapitanga && docker-compose -f docker-compose.vps.yml restart
```

---

**Data do Deploy**: ___/___/______
**Responsável**: ________________
**Versão**: ________________
