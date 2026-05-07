#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/placar.digital/current}"
cd "$APP_DIR"

git pull --ff-only origin "${BRANCH:-main}"
npm install --omit=dev
node --check app.js
node --check public/app.js
pm2 restart placar-digital --update-env
pm2 save
