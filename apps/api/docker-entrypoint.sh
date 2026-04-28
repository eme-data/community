#!/bin/sh
set -e

# The api role is responsible for applying the database schema.
# The worker waits for it to be applied.
#
# - If prisma/migrations/ exists and is non-empty, we apply migrations
#   (proper production workflow).
# - Otherwise (fresh self-hosted install), we sync the schema directly
#   with `prisma db push`. Without --accept-data-loss, this errors out
#   on destructive changes — safer than silently dropping columns.
if [ "$ROLE" = "api" ]; then
  if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "[entrypoint] Running prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[entrypoint] No migrations folder — syncing schema with prisma db push..."
    npx prisma db push --skip-generate
  fi
fi

exec "$@"
