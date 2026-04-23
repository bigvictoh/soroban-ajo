#!/usr/bin/env bash
# verify-restore.sh — Smoke-test a restored PostgreSQL instance.
#
# Usage: ./verify-restore.sh [--host HOST] [--port PORT] [--user USER] [--dbname DBNAME]
#
# Exits 0 on success, non-zero on failure.

set -euo pipefail

PG_HOST="${1:-localhost}"
PG_PORT="${2:-5432}"
PG_USER="${3:-postgres}"
PG_DB="${4:-postgres}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)   PG_HOST="$2";  shift 2 ;;
    --port)   PG_PORT="$2";  shift 2 ;;
    --user)   PG_USER="$2";  shift 2 ;;
    --dbname) PG_DB="$2";    shift 2 ;;
    *) shift ;;
  esac
done

PSQL="psql -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} -d ${PG_DB} -t -A -c"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Verifying restored PostgreSQL instance at ${PG_HOST}:${PG_PORT}"

# 1. Connectivity check
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Check 1: connectivity..."
$PSQL "SELECT 1" > /dev/null
echo "  PASS"

# 2. Recovery mode check — must NOT be in recovery after promotion
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Check 2: not in recovery mode..."
IN_RECOVERY=$($PSQL "SELECT pg_is_in_recovery()")
if [[ "$IN_RECOVERY" == "t" ]]; then
  echo "  FAIL: instance is still in recovery mode" >&2
  exit 1
fi
echo "  PASS"

# 3. Core tables exist
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Check 3: core tables present..."
TABLES=("User" "Group" "GroupMember" "Contribution")
for TABLE in "${TABLES[@]}"; do
  COUNT=$($PSQL "SELECT COUNT(*) FROM \"${TABLE}\"" 2>/dev/null || echo "ERROR")
  if [[ "$COUNT" == "ERROR" ]]; then
    echo "  FAIL: table '${TABLE}' not accessible" >&2
    exit 1
  fi
  echo "  ${TABLE}: ${COUNT} rows — OK"
done

# 4. WAL position sanity
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Check 4: WAL position..."
LSN=$($PSQL "SELECT pg_current_wal_lsn()")
echo "  Current LSN: ${LSN} — OK"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] All checks passed. Restore verified successfully."
