FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir -U pip

COPY . /app

RUN pip install --no-cache-dir .

CMD ["sh", "-lc", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
