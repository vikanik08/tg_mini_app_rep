FROM node:22-slim AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./

ARG VITE_API_URL=https://smartpet-lunyc.amvera.io
ARG VITE_USE_DEV_LOGIN=false
ARG VITE_PLATFORM_TARGET=auto
ARG VITE_YANDEX_METRICA_ID=108964987

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_DEV_LOGIN=$VITE_USE_DEV_LOGIN
ENV VITE_PLATFORM_TARGET=$VITE_PLATFORM_TARGET
ENV VITE_YANDEX_METRICA_ID=$VITE_YANDEX_METRICA_ID

RUN npm run build

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir -U pip

COPY backend /app

RUN pip install --no-cache-dir /app

COPY --from=frontend-build /frontend/dist /frontend/dist
COPY amvera/frontend_server.py /frontend/server.py
COPY amvera/start.sh /start.sh

RUN chmod +x /start.sh

CMD ["/start.sh"]
