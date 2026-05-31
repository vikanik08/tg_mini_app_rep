#!/bin/sh
set -eu

if [ "${APP_ROLE:-backend}" = "frontend" ]; then
  exec python /frontend/server.py --host 0.0.0.0 --port "${PORT:-8000}"
fi

for attempt in 1 2 3 4 5; do
  if alembic upgrade head; then
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
  fi

  echo "Database migration failed on attempt ${attempt}; retrying in 5 seconds..."
  sleep 5
done

echo "Database migration failed after retries"
exit 1
