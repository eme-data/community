#!/bin/sh
# =====================================================================
# Community — backup loop for Postgres + uploads.
# Runs inside the `backup` service container (postgres:16-alpine base).
# =====================================================================
set -eu

: "${POSTGRES_HOST:=postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${BACKUP_DIR:=/backups}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"   # 24h
: "${BACKUP_RETENTION_DAYS:=14}"
: "${BACKUP_INCLUDE_UPLOADS:=true}"
: "${UPLOADS_DIR:=/uploads}"

export PGPASSWORD="$POSTGRES_PASSWORD"
mkdir -p "$BACKUP_DIR"

log() { echo "[backup $(date -u +%FT%TZ)] $*"; }

run_backup() {
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  pg_file="$BACKUP_DIR/db-$ts.sql.gz"
  log "Dumping $POSTGRES_DB → $pg_file"
  if ! pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        --format=plain --no-owner --no-privileges "$POSTGRES_DB" \
        | gzip -9 > "$pg_file.tmp"; then
    rm -f "$pg_file.tmp"
    log "ERROR pg_dump failed"
    return 1
  fi
  mv "$pg_file.tmp" "$pg_file"
  log "DB backup OK ($(du -h "$pg_file" | cut -f1))"

  if [ "$BACKUP_INCLUDE_UPLOADS" = "true" ] && [ -d "$UPLOADS_DIR" ]; then
    up_file="$BACKUP_DIR/uploads-$ts.tar.gz"
    log "Archiving uploads → $up_file"
    if ! tar -C "$UPLOADS_DIR" -czf "$up_file.tmp" .; then
      rm -f "$up_file.tmp"
      log "WARN uploads archive failed"
    else
      mv "$up_file.tmp" "$up_file"
      log "Uploads backup OK ($(du -h "$up_file" | cut -f1))"
    fi
  fi

  # Retention: keep the last N days of files (DB + uploads). find -mtime keeps it simple.
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -delete || true
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'uploads-*.tar.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -delete || true
}

# One-shot mode (when invoked manually).
if [ "${1:-}" = "once" ]; then
  run_backup
  exit $?
fi

log "Backup loop started — interval=${BACKUP_INTERVAL_SECONDS}s retention=${BACKUP_RETENTION_DAYS}d"
while true; do
  if ! run_backup; then
    log "Backup failed — will retry next cycle"
  fi
  sleep "$BACKUP_INTERVAL_SECONDS"
done
