#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-placar.digital}"
APP_USER="${APP_USER:-placar}"
APP_DIR="${APP_DIR:-/var/www/placar.digital}"
REPO_URL="${REPO_URL:-https://github.com/pauloneto1979/placar.digital.git}"
DB_NAME="${DB_NAME:-placar_digital}"
DB_USER="${DB_USER:-placar_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Defina DB_PASSWORD antes de executar."
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git nginx postgresql postgresql-contrib ufw logrotate

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"/{releases,shared/uploads,shared/backups,current}
mkdir -p /var/log/placar.digital /var/www/certbot
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" /var/log/placar.digital

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
do \$\$
begin
  if not exists (select from pg_roles where rolname = '$DB_USER') then
    create role $DB_USER login password '$DB_PASSWORD';
  end if;
end
\$\$;
select 'create database $DB_NAME owner $DB_USER encoding ''UTF8'' template template0'
where not exists (select from pg_database where datname = '$DB_NAME')\\gexec
SQL

if [[ ! -d "$APP_DIR/current/.git" ]]; then
  rm -rf "$APP_DIR/current"
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR/current"
fi

if [[ ! -f "$APP_DIR/shared/.env.production" ]]; then
  cp "$APP_DIR/current/.env.production.example" "$APP_DIR/shared/.env.production"
  sed -i "s#DATABASE_URL=.*#DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME#" "$APP_DIR/shared/.env.production"
  sed -i "s#CORS_ORIGINS=.*#CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN#" "$APP_DIR/shared/.env.production"
  sed -i "s#AUTH_TOKEN_SECRET=.*#AUTH_TOKEN_SECRET=$(openssl rand -hex 48)#" "$APP_DIR/shared/.env.production"
  chown "$APP_USER":"$APP_USER" "$APP_DIR/shared/.env.production"
  chmod 600 "$APP_DIR/shared/.env.production"
fi

ln -sfn "$APP_DIR/shared/.env.production" "$APP_DIR/current/.env"
cp "$APP_DIR/current/ops/logrotate/placar.digital" /etc/logrotate.d/placar.digital

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "Setup base concluido. Configure Nginx/SSL com ops/scripts/setup-nginx-ssl.sh."
