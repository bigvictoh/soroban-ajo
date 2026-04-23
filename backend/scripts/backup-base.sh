#!/usr/bin/env bash
# backup-base.sh — Take a full PostgreSQL base backup and upload to storage.
#
# Usage: ./backup-base.sh [--storage-path PATH]
#
# Environment variables:
#   DATABASE_URL          PostgreSQL connection URL
#   BACKUP_STORAGE_PATH   Local or mounted path for backup storage (default: /tmp/backups)
#   BACKUP_ENCRYPTION_KEY_ID  Key ID for envelope encryption metadata

set -euo pipefail

STORAGE_PATH="${BACKUP_STORAGE_PATH:-/tmp/backups}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
YEAR=$(date -u +"%Y")
MONTH=$(date -u +"%m")
DAY=$(date -u +"%d")
DEST="${STORAGE_PATH}/base/${YEAR}/${MONTH}/${DAY}/${TIMESTAMP}"

# Parse DATABASE_URL
DB_URL="${DATABASE_URL:-}"
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

PG_HOST=$(python3 -c "from urllib.parse import urlparse; u=urlparse('${DB_URL}'); print(u.hostname)" 2>/dev/null || echo "localhost")
PG_PORT=$(python3 -c "from urllib.parse import urlparse; u=urlparse('${DB_URL}'); print(u.port or 5432)" 2>/dev/null || echo "5432")
PG_USER=$(python3 -c "from urllib.parse import urlparse; u=urlparse('${DB_URL}'); print(u.username or 'postgres')" 2>/dev/null || echo "postgres")

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting full base backup → ${DEST}"
mkdir -p "${DEST}"

# Run pg_basebackup (tar format, gzip compressed)
pg_basebackup \
  -h "${PG_HOST}" \
  -p "${PG_PORT}" \
  -U "${PG_USER}" \
  -D "${DEST}" \
  -Ft -z -P \
  --wal-method=stream

# Compute checksum manifest
CHECKSUM_FILE="${DEST}/CHECKSUM.sha256"
find "${DEST}" -type f ! -name "CHECKSUM.sha256" | sort | xargs sha256sum > "${CHECKSUM_FILE}"

# Write metadata
cat > "${DEST}/METADATA.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "pg_host": "${PG_HOST}",
  "pg_port": "${PG_PORT}",
  "encryption_key_id": "${BACKUP_ENCRYPTION_KEY_ID:-default-key-id}",
  "tool": "backup-base.sh",
  "tool_version": "1.0.0"
}
EOF

SIZE=$(du -sh "${DEST}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup complete. Size: ${SIZE}. Path: ${DEST}"
