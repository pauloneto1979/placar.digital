#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-placar.digital}"
EMAIL="${EMAIL:-admin@$DOMAIN}"
APP_DIR="${APP_DIR:-/var/www/placar.digital}"

apt-get update
apt-get install -y certbot python3-certbot-nginx nginx

cp "$APP_DIR/current/ops/nginx/placar.digital.conf" /etc/nginx/sites-available/placar.digital
sed -i "s/placar.digital/$DOMAIN/g" /etc/nginx/sites-available/placar.digital
ln -sfn /etc/nginx/sites-available/placar.digital /etc/nginx/sites-enabled/placar.digital
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --redirect
systemctl enable --now certbot.timer
certbot renew --dry-run

nginx -t
systemctl reload nginx
