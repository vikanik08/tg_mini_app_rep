#!/bin/sh
set -eu

if [ "${APP_ROLE:-backend}" = "frontend" ]; then
  exec python /frontend/server.py --host 0.0.0.0 --port "${PORT:-8000}"
fi

max_attempts="${DB_MIGRATION_MAX_ATTEMPTS:-60}"
retry_delay="${DB_MIGRATION_RETRY_DELAY_SECONDS:-10}"
attempt=1

while [ "$attempt" -le "$max_attempts" ]; do
  if alembic upgrade head; then
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
  fi

  echo "Database migration failed on attempt ${attempt}/${max_attempts}; retrying in ${retry_delay} seconds..."
  attempt=$((attempt + 1))
  sleep "$retry_delay"
done

echo "Database migration failed after retries"
exit 1
