#!/usr/bin/env bash
# Script: scripts/dev_up.sh
# Start the stack locally using docker compose. Does not modify files.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Building and starting services with docker compose..."
docker compose up -d --build
echo "Services started. Use 'make logs' to tail logs or 'make down' to stop."
