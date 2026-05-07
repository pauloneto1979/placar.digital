#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/placar.digital/current}"
APP_USER="${APP_USER:-placar}"
BRANCH="${BRANCH:-main}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
PREVIOUS_COMMIT=""

cd "$APP_DIR"
PREVIOUS_COMMIT="$(git rev-parse HEAD)"

rollback() {
  echo "[deploy] erro detectado. Fazendo rollback para $PREVIOUS_COMMIT"
  git reset --hard "$PREVIOUS_COMMIT"
  npm install --omit=dev
  pm2 restart placar-digital --update-env || true
}

trap rollback ERR

echo "[deploy] atualizando codigo"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] instalando dependencias"
npm install --omit=dev

echo "[deploy] validando sintaxe"
node --check app.js
node --check public/app.js
node --check public/login.js
node --check public/selecao-bolao.js

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  echo "[deploy] aplicando migrations"
  npm run migrate
fi

echo "[deploy] reiniciando pm2"
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "[deploy] validando aplicacao"
curl -fsS "http://127.0.0.1:${PORT:-3002}/" >/dev/null
pm2 status placar-digital

trap - ERR
echo "[deploy] concluido"
