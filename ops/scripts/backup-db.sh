#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/placar.digital}"
ENV_FILE="${ENV_FILE:-$APP_DIR/shared/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/shared/backups}"

set -a
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/placar_digital_$(date +%Y%m%d_%H%M%S).dump"

pg_dump "$DATABASE_URL" --format=custom --file="$FILE"
gzip -f "$FILE"

find "$BACKUP_DIR" -name '*.dump.gz' -mtime +14 -delete
echo "$FILE.gz"
