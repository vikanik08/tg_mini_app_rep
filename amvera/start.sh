#!/bin/sh
set -eu

if [ "${APP_ROLE:-backend}" = "frontend" ]; then
  exec python /frontend/server.py --host 0.0.0.0 --port "${PORT:-8000}"
fi

exec sh -lc "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
