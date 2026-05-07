# Placar.digital em produção

Guia para publicar o Placar.digital em uma VPS Ubuntu 24 com Node.js LTS, PostgreSQL, Nginx, PM2, HTTPS Let's Encrypt, Cloudflare e deploy via GitHub.

## Arquitetura Recomendada

- Sistema: Ubuntu 24 LTS
- App Node.js: porta interna `3002`
- Reverse proxy: Nginx em `80/443`
- Processo: PM2 com nome `placar-digital`
- Banco: PostgreSQL local na VPS
- Deploy: `git pull` da branch `main`
- Diretórios:
  - app: `/var/www/placar.digital/current`
  - env: `/var/www/placar.digital/shared/.env.production`
  - uploads futuros: `/var/www/placar.digital/shared/uploads`
  - backups: `/var/www/placar.digital/shared/backups`
  - logs app: `/var/log/placar.digital`
  - logs nginx: `/var/log/nginx/placar.digital.*.log`

## DNS e Cloudflare

1. Crie registros DNS:
   - `A placar.digital -> IP_DA_VPS`
   - `A www -> IP_DA_VPS`
2. Em Cloudflare, use SSL/TLS em `Full (strict)` após emitir o certificado.
3. Durante emissão inicial do Let's Encrypt, se houver problema, deixe o proxy Cloudflare em `DNS only`.
4. Após validar HTTPS, pode voltar para proxy laranja.
5. Ative:
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - Brotli
   - HTTP/2 ou HTTP/3 quando disponível

## Setup Inicial

Conecte na VPS:

```bash
ssh root@IP_DA_VPS
```

Execute:

```bash
export DOMAIN=placar.digital
export APP_USER=placar
export REPO_URL=https://github.com/pauloneto1979/placar.digital.git
export DB_NAME=placar_digital
export DB_USER=placar_user
export DB_PASSWORD='troque-por-uma-senha-forte'
curl -fsSL https://raw.githubusercontent.com/pauloneto1979/placar.digital/main/ops/scripts/setup-server.sh -o /tmp/setup-server.sh
bash /tmp/setup-server.sh
```

Edite o env de produção:

```bash
nano /var/www/placar.digital/shared/.env.production
```

Campos obrigatórios:

- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `CORS_ORIGINS`
- `PORT=3002`
- `NODE_ENV=production`

## Instalar e Subir App

```bash
cd /var/www/placar.digital/current
ln -sfn /var/www/placar.digital/shared/.env.production .env
npm install --omit=dev
npm run migrate
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup systemd
```

O comando `pm2 startup` imprime um comando com `sudo`. Execute exatamente o comando exibido.

## Nginx e HTTPS

Antes de rodar, confirme que DNS aponta para a VPS.

```bash
export DOMAIN=placar.digital
export EMAIL=admin@placar.digital
bash /var/www/placar.digital/current/ops/scripts/setup-nginx-ssl.sh
```

Validações:

```bash
nginx -t
systemctl status nginx --no-pager
certbot certificates
curl -I http://placar.digital
curl -I https://placar.digital
```

Esperado:

- HTTP retorna redirect para HTTPS.
- HTTPS retorna `200`, `301` ou app.
- Certbot timer ativo:

```bash
systemctl list-timers | grep certbot
```

## Deploy

Deploy padrão:

```bash
cd /var/www/placar.digital/current
bash ops/scripts/deploy.sh
```

Sem migrations:

```bash
RUN_MIGRATIONS=false bash ops/scripts/deploy.sh
```

O script:

- executa `git pull --ff-only`
- instala dependências
- roda checks
- aplica migrations
- reinicia PM2
- valida app local
- tenta rollback se falhar antes do final

## Banco PostgreSQL

Configurações recomendadas:

```bash
sudo -u postgres psql
```

```sql
alter database placar_digital set timezone to 'America/Sao_Paulo';
alter database placar_digital set client_encoding to 'UTF8';
alter database placar_digital set lc_messages to 'C';
```

Teste de conexão:

```bash
cd /var/www/placar.digital/current
node -e "require('dotenv').config(); const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL }); c.connect().then(()=>c.query('select now()')).then(r=>{console.log(r.rows[0]); return c.end();}).catch(e=>{console.error(e.message); process.exit(1);})"
```

## Backups

Backup manual:

```bash
bash /var/www/placar.digital/current/ops/scripts/backup-db.sh
```

Cron diário às 03:10:

```bash
crontab -e
```

```cron
10 3 * * * /bin/bash /var/www/placar.digital/current/ops/scripts/backup-db.sh >> /var/log/placar.digital/backup.log 2>&1
```

Restore:

```bash
bash /var/www/placar.digital/current/ops/scripts/restore-db.sh /var/www/placar.digital/shared/backups/arquivo.dump.gz
```

## Logs

App:

```bash
pm2 logs placar-digital
tail -f /var/log/placar.digital/app-error.log
tail -f /var/log/placar.digital/app-out.log
```

Nginx:

```bash
tail -f /var/log/nginx/placar.digital.access.log
tail -f /var/log/nginx/placar.digital.error.log
```

Logrotate:

```bash
logrotate -d /etc/logrotate.d/placar.digital
```

## Segurança Aplicada

- `helmet` para headers básicos.
- `x-powered-by` desativado.
- `cors` com `CORS_ORIGINS`.
- rate limit básico.
- `trust proxy` preparado para Nginx/Cloudflare.
- Nginx com headers de segurança.
- HTTPS com Let's Encrypt.
- redirecionamento HTTP -> HTTPS.
- `.env` fora do Git.
- token football-data nunca exposto publicamente.
- diretório persistente para uploads futuros.

## Checklist de Deploy

- [ ] DNS aponta para a VPS.
- [ ] `.env.production` preenchido.
- [ ] `npm install --omit=dev` sem erro.
- [ ] `npm run migrate` executado.
- [ ] `pm2 status placar-digital` online.
- [ ] porta interna `3002` escutando apenas local/proxy.
- [ ] `curl http://127.0.0.1:3002/` responde.
- [ ] Nginx ativo.
- [ ] HTTPS ativo.

## Checklist HTTPS

- [ ] `certbot certificates` mostra certificado válido.
- [ ] `curl -I http://dominio` redireciona para HTTPS.
- [ ] `curl -I https://dominio` responde.
- [ ] Cloudflare em `Full (strict)`.
- [ ] renovação testada com `certbot renew --dry-run`.

## Checklist DNS

- [ ] `A @ -> IP_DA_VPS`
- [ ] `A www -> IP_DA_VPS`
- [ ] proxy Cloudflare reativado após SSL.
- [ ] cache Cloudflare não aplicado agressivamente a `/api/*`.

## Checklist Segurança

- [ ] `AUTH_TOKEN_SECRET` forte.
- [ ] `DATABASE_URL` não exposta.
- [ ] firewall com somente SSH, HTTP e HTTPS.
- [ ] PM2 startup habilitado.
- [ ] backups automáticos.
- [ ] logs com rotação.
- [ ] Node.js `>=20`.
- [ ] PostgreSQL com senha forte.

## Troubleshooting

### PM2 online mas site fora

```bash
pm2 logs placar-digital --lines 80
ss -ltnp | grep 3002
curl -v http://127.0.0.1:3002/
nginx -t
tail -n 80 /var/log/nginx/placar.digital.error.log
```

### EADDRINUSE

```bash
ss -ltnp | grep :3002
pm2 status
pkill -f "node app.js"
pm2 restart placar-digital --update-env
```

Use `pkill` somente se confirmar que o processo conflitante não é o PM2 correto.

### Migration falhou

```bash
cd /var/www/placar.digital/current
npm run migrate
```

Se o banco já existia antes do runner, ele falha com segurança antes de reaplicar migrations. Depois de validar que o schema atual já contém todas as migrations versionadas, registre o baseline uma única vez:

```bash
MIGRATIONS_BASELINE=true npm run migrate
```

### Cloudflare 525/526

- 525: Cloudflare não conseguiu negociar SSL com a VPS.
- 526: certificado inválido para `Full (strict)`.

Verifique:

```bash
certbot certificates
nginx -t
openssl s_client -connect placar.digital:443 -servername placar.digital
```

## Comandos Finais Rápidos

```bash
cd /var/www/placar.digital/current
git pull --ff-only origin main
npm install --omit=dev
npm run migrate
node --check app.js
node --check public/app.js
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 status
curl -I https://placar.digital
```
