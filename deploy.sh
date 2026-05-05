#!/usr/bin/env bash
set -euo pipefail

VPS_IP="${1:?Usage: ./deploy.sh <VPS_IP> [user=root]}"
VPS_USER="${2:-root}"
APP_DIR="/opt/falando-portugues"

echo "==> Deploying to $VPS_USER@$VPS_IP ..."

# Push current code to VPS (excludes secrets, build artifacts, and mobile)
rsync -az --delete \
  --exclude '.git' \
  --exclude '.superpowers' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'falando.db' \
  --exclude 'node_modules' \
  --exclude 'mobile' \
  --exclude 'ios' \
  --exclude 'android' \
  --exclude '.expo' \
  --exclude 'luso_tutor' \
  --exclude 'luso_tutor_arm' \
  --exclude '.venv-test' \
  --exclude 'venv' \
  ./ "$VPS_USER@$VPS_IP:$APP_DIR/"

echo "==> Files synced. Starting containers..."

ssh "$VPS_USER@$VPS_IP" bash << EOF
  set -e
  cd $APP_DIR

  if [ ! -f backend/.env ]; then
    echo "ERROR: backend/.env does not exist on the VPS."
    echo "Create it from backend/.env.example, fill the keys and run deploy again."
    exit 2
  fi

  # Install Docker if not present
  if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
  fi

  if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow 80/tcp >/dev/null || true
    ufw allow 443/tcp >/dev/null || true
  fi

  docker compose pull 2>/dev/null || true
  docker compose up --build -d
  echo ""
  docker compose ps
  echo ""
  echo "==> Health check..."
  sleep 5
  curl -sf http://localhost:8000/health && echo " Backend OK" || echo " Backend health check failed"
  curl -sf https://37-27-196-137.nip.io/health && echo " HTTPS OK" || echo " HTTPS health check failed"
EOF

echo ""
echo "==> Deploy complete!"
echo "    Backend: https://37-27-196-137.nip.io"
echo "    Health:  https://37-27-196-137.nip.io/health"
