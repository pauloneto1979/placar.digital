#!/usr/bin/env bash
set -euo pipefail

pm2 restart placar-digital --update-env
pm2 save
pm2 status placar-digital
