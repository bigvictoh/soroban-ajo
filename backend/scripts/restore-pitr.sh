#!/usr/bin/env bash
# restore-pitr.sh — Restore PostgreSQL to a point in time from a base backup + WAL.
#
# Usage:
#   ./restore-pitr.sh --base-path PATH --wal-path PATH --target-time "2026-04-23 12:00:00 UTC" --pgdata PATH
#
# Options:
#   --base-path    Path to the base backup directory (contains base.tar.gz)
#   --wal-path     Path to the WAL archive directory
#   --target-time  Recovery target timestamp (UTC). Omit for latest.
#   --pgdata       Target PGDATA directory for the restored instance

set -euo pipefail

BASE_PATH=""
WAL_PATH=""
TARGET_TIME=""
PGDATA=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-path)   BASE_PATH="$2";   shift 2 ;;
    --wal-path)    WAL_PATH="$2";    shift 2 ;;
    --target-time) TARGET_TIME="$2"; shift 2 ;;
    --pgdata)      PGDATA="$2";      shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$BASE_PATH" || -z "$WAL_PATH" || -z "$PGDATA" ]]; then
  echo "Usage: $0 --base-path PATH --wal-path PATH --pgdata PATH [--target-time TIMESTAMP]" >&2
  exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting PITR restore"
echo "  Base backup : ${BASE_PATH}"
echo "  WAL archive : ${WAL_PATH}"
echo "  Target time : ${TARGET_TIME:-latest}"
echo "  PGDATA      : ${PGDATA}"

# 1. Verify base backup checksum
if [[ -f "${BASE_PATH}/CHECKSUM.sha256" ]]; then
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Verifying base backup checksums..."
  (cd "${BASE_PATH}" && sha256sum --check CHECKSUM.sha256)
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Checksums OK"
else
  echo "WARNING: No CHECKSUM.sha256 found — skipping integrity check" >&2
fi

# 2. Prepare PGDATA
rm -rf "${PGDATA}"
mkdir -p "${PGDATA}"
chmod 700 "${PGDATA}"

# 3. Extract base backup
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Extracting base backup..."
tar -xzf "${BASE_PATH}/base.tar.gz" -C "${PGDATA}"

# 4. Write recovery configuration
RECOVERY_CONF="${PGDATA}/postgresql.auto.conf"
cat >> "${RECOVERY_CONF}" <<EOF

# PITR recovery settings (appended by restore-pitr.sh)
restore_command = 'cp ${WAL_PATH}/%f %p'
recovery_target_action = 'promote'
EOF

if [[ -n "$TARGET_TIME" ]]; then
  echo "recovery_target_time = '${TARGET_TIME}'" >> "${RECOVERY_CONF}"
  echo "recovery_target_inclusive = true" >> "${RECOVERY_CONF}"
fi

# 5. Create recovery signal file (PostgreSQL 12+)
touch "${PGDATA}/recovery.signal"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Recovery configuration written to ${RECOVERY_CONF}"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Start PostgreSQL with: pg_ctl -D '${PGDATA}' start"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Then run verify-restore.sh to confirm data integrity."
