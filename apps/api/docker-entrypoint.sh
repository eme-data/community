#!/bin/sh
set -e

# The api role is responsible for applying database migrations.
# The worker waits for them to be applied.
if [ "$ROLE" = "api" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

exec "$@"
