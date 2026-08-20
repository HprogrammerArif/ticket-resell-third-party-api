#!/usr/bin/env bash
# ==============================================================================
# TicketLove — Automated Encrypted Database Backup & Off-Server Sync
# Run nightly via cron (e.g. at 03:15 UTC)
# ==============================================================================

set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
DIR=/opt/ticketlove/backups
PASSPHRASE_FILE=/opt/ticketlove/.backup-passphrase
COMPOSE_FILE=/opt/ticketlove/docker-compose.yml

mkdir -p "$DIR"

if [ ! -f "$PASSPHRASE_FILE" ]; then
  echo "Error: Passphrase file $PASSPHRASE_FILE not found!" >&2
  exit 1
fi

echo "Starting backup at $(date)..."

# 1. Dump from inside the container, compress, and AES256 encrypt
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U ticketlove -d ticketlove --format=custom \
  | gzip \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase-file "$PASSPHRASE_FILE" \
        -o "$DIR/ticketlove-$STAMP.dump.gz.gpg"

echo "Database dump and encryption completed: $DIR/ticketlove-$STAMP.dump.gz.gpg"

# 2. Upload to Cloudflare R2 / Backblaze B2 (if rclone is configured)
if command -v rclone &> /dev/null; then
  echo "Syncing backup to off-server remote storage..."
  rclone copy "$DIR/ticketlove-$STAMP.dump.gz.gpg" remote:ticketlove-backups/
  echo "Off-server backup synced successfully."
else
  echo "Notice: rclone is not installed or configured. Backup is local only."
fi

# 3. Retain 7 days locally (remote bucket holds the long tail)
find "$DIR" -name 'ticketlove-*.dump.gz.gpg' -mtime +7 -delete

echo "Backup process finished successfully at $(date)."
