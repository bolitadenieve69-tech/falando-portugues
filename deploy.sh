#!/usr/bin/env bash
set -euo pipefail

VPS_IP="${1:?Usage: ./deploy.sh <VPS_IP> [user=root]}"
VPS_USER="${2:-root}"
APP_DIR="/opt/falando-portugues"

echo "==> Deploying to $VPS_USER@$VPS_IP ..."

# Push current code to VPS (excludes secrets, build artifacts, and mobile)
rsync -az --delete \
  --exclude '.git' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude 'ios' \
  --exclude 'android' \
  --exclude '.expo' \
  --exclude 'luso_tutor' \
  ./ "$VPS_USER@$VPS_IP:$APP_DIR/"

echo "==> Files synced. Starting containers..."

ssh "$VPS_USER@$VPS_IP" bash << EOF
  set -e
  cd $APP_DIR

  # Install Docker if not present
  if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
  fi

  docker compose pull 2>/dev/null || true
  docker compose up --build -d backend
  echo ""
  docker compose ps
  echo ""
  echo "==> Health check..."
  sleep 5
  curl -sf http://localhost:8000/health && echo " Backend OK" || echo " Health check failed"
EOF

echo ""
echo "==> Deploy complete!"
echo "    Backend: http://$VPS_IP:8000"
echo "    Health:  http://$VPS_IP:8000/health"
