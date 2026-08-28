#!/usr/bin/env bash
# Uploads the EXPO_PUBLIC_* values from .env.local to the EAS "development"
# environment, so cloud builds get them. Values are never printed.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] || { echo "No encuentro .env.local"; exit 1; }

read_var() { grep "^$1=" .env.local | cut -d= -f2- | tr -d '[:space:]'; }

for NAME in EXPO_PUBLIC_BACKEND_URL EXPO_PUBLIC_LIVEKIT_URL EXPO_PUBLIC_APP_TOKEN; do
  VALUE="$(read_var "$NAME" || true)"
  if [ -z "$VALUE" ]; then
    echo "  omitido $NAME (vacío en .env.local)"
    continue
  fi
  VIS=plaintext
  [ "$NAME" = "EXPO_PUBLIC_APP_TOKEN" ] && VIS=sensitive
  echo "  subiendo $NAME (${#VALUE} caracteres, $VIS)…"
  npx eas env:create \
    --environment development \
    --name "$NAME" \
    --value "$VALUE" \
    --visibility "$VIS" \
    --scope project \
    --non-interactive 2>&1 | tail -2
done
echo
echo "Comprobación:"
npx eas env:list --environment development
