#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/placar.digital}"
ENV_FILE="${ENV_FILE:-$APP_DIR/shared/.env.production}"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Uso: $0 /caminho/backup.dump.gz"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

TMP_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  TMP_FILE="/tmp/$(basename "$BACKUP_FILE" .gz)"
  gunzip -c "$BACKUP_FILE" > "$TMP_FILE"
fi

echo "ATENCAO: restore sobrescreve objetos existentes se usado com --clean."
read -r -p "Digite RESTAURAR para continuar: " CONFIRM
if [[ "$CONFIRM" != "RESTAURAR" ]]; then
  echo "Cancelado."
  exit 1
fi

pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$TMP_FILE"
