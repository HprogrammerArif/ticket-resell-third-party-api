#!/usr/bin/env bash
# ==============================================================================
# TicketLove — Automated Encrypted Database Backup & Off-Server Sync
#
# Run nightly via cron (see infra/README-backups.md).
#
# Produces an AES256-encrypted, gzipped pg_dump and — once an rclone remote is
# configured — ships it off-server. A backup that only exists on the machine it
# came from is not a backup: the single most likely thing to destroy the data is
# also the thing that would destroy the copy.
# ==============================================================================

set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
DIR=/opt/ticketlove/backups
PASSPHRASE_FILE=/opt/ticketlove/.backup-passphrase
COMPOSE_DIR=/opt/ticketlove
RCLONE_REMOTE="${RCLONE_REMOTE:-ticketlove-backup}"   # override via env
RETAIN_DAYS=7

mkdir -p "$DIR"

if [ ! -f "$PASSPHRASE_FILE" ]; then
  echo "ERROR: passphrase file $PASSPHRASE_FILE not found" >&2
  exit 1
fi

# cd rather than `-f`: Compose resolves ${POSTGRES_PASSWORD} from ./.env in the
# project directory, and cron runs with a different working directory.
cd "$COMPOSE_DIR"

OUT="$DIR/ticketlove-$STAMP.dump.gz.gpg"

echo "[$(date -Is)] starting backup -> $OUT"

# --format=custom keeps pg_restore's selective-restore options available.
# PIPESTATUS is checked because a failing pg_dump inside a pipeline would
# otherwise still produce a small, valid-looking .gpg file.
set +e
docker compose exec -T db \
  pg_dump -U ticketlove -d ticketlove --format=custom \
  | gzip \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase-file "$PASSPHRASE_FILE" \
        -o "$OUT"
STATUS=("${PIPESTATUS[@]}")
set -e

for i in "${!STATUS[@]}"; do
  if [ "${STATUS[$i]}" -ne 0 ]; then
    echo "ERROR: stage $i of the dump pipeline failed (exit ${STATUS[$i]})" >&2
    rm -f "$OUT"
    exit 1
  fi
done

SIZE=$(stat -c %s "$OUT")
if [ "$SIZE" -lt 1000 ]; then
  echo "ERROR: backup is only ${SIZE} bytes — refusing to keep a likely-empty dump" >&2
  rm -f "$OUT"
  exit 1
fi
echo "[$(date -Is)] encrypted dump written: $OUT (${SIZE} bytes)"

# --- Off-server copy -----------------------------------------------------------
# Configure once with: rclone config   (remote name must match RCLONE_REMOTE)
if rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
  echo "[$(date -Is)] uploading to ${RCLONE_REMOTE}:ticketlove-backups/"
  rclone copy "$OUT" "${RCLONE_REMOTE}:ticketlove-backups/"
  echo "[$(date -Is)] off-server copy complete"
else
  echo "[$(date -Is)] WARNING: rclone remote '${RCLONE_REMOTE}' is not configured." >&2
  echo "[$(date -Is)] WARNING: this backup exists ONLY on this server and does not" >&2
  echo "[$(date -Is)] WARNING: protect against disk or server loss. Run 'rclone config'." >&2
fi

# --- Local retention -----------------------------------------------------------
find "$DIR" -name 'ticketlove-*.dump.gz.gpg' -mtime +${RETAIN_DAYS} -delete
echo "[$(date -Is)] backup finished. Local copies:"
ls -1sh "$DIR" | tail -n +2
