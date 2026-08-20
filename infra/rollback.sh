#!/usr/bin/env bash
# ==============================================================================
# TicketLove — One-Command Deployment Rollback
# Usage: ./rollback.sh <target-git-sha-or-tag>
# Example: ./rollback.sh abc1234
# ==============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <git-sha-or-tag>"
  echo "Example: $0 8f2c3a1"
  exit 1
fi

TARGET_TAG="$1"
COMPOSE_DIR="/opt/ticketlove"

cd "$COMPOSE_DIR"

echo "Rolling back web and api services to image tag: $TARGET_TAG..."

TAG="$TARGET_TAG" docker compose pull web api
TAG="$TARGET_TAG" docker compose up -d --no-deps web api

echo "Rollback to tag $TARGET_TAG completed successfully."
docker compose ps
