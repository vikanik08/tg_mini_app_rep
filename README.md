# TG Mini App Pet Care Tracker

Мини-апп для учета питомцев, процедур и ближайших событий ухода.

## Состав репозитория

- `backend` - FastAPI + PostgreSQL + SQLAlchemy + Alembic
- `frontend` - React + TypeScript + Vite
- `docker-compose.yml` - локальный запуск backend и базы

## Что уже работает на staging

- авторизация через backend с dev-login для локальной разработки
- live dashboard на главном экране
- live calendar по месяцу и выбранному дню
- паспорт питомца и редактирование питомца
- сохранение процедур через `events`
- профиль пользователя
- маршруты паспорта и процедур через явный `petId` в URL

## Стек

- Python 3.11
- FastAPI
- PostgreSQL 16
- SQLAlchemy 2
- Alembic
- React 19
- React Query
- React Router
- Vite
- Docker Compose

## Быстрый старт

1. Скопировать env-файлы:

```powershell
Copy-Item .\backend\.env.example .\backend\.env -ErrorAction SilentlyContinue
Copy-Item .\frontend\.env.example .\frontend\.env -ErrorAction SilentlyContinue
```

2. Поднять backend и базу:

```powershell
docker compose up -d --build
```

3. Проверить backend:

```powershell
curl http://localhost:8000/health
```

4. Запустить frontend:

```powershell
cd .\frontend
npm install
npm run dev
```

5. Открыть приложение:

- frontend: `http://localhost:5173`
- backend docs: `http://localhost:8000/docs`

## Полезные команды

Backend:

```powershell
docker compose exec backend sh -lc "cd /app && alembic upgrade head"
docker compose exec backend sh -lc "cd /app && python -m app.scripts.seed"
docker compose logs backend --tail 100
```

Frontend:

```powershell
cd .\frontend
npm run lint
npm run build
```

## Конфигурация

Backend использует переменные из `backend/.env` и `backend/.env.local`.

Основные переменные backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `CORS_ORIGINS`
- `ALLOW_DEV_LOGIN`

Frontend использует:

- `VITE_API_URL`
- `VITE_USE_DEV_LOGIN`
- `VITE_DEV_TELEGRAM_ID`

## Основные API-ручки

- `GET /health`
- `POST /auth/telegram`
- `POST /dev/login`
- `GET /pets`
- `POST /pets`
- `GET /events`
- `POST /events`
- `GET /dashboard`
- `GET /calendar/month`
- `GET /calendar/day`

## Что улучшать дальше

- полноценный Telegram `initData` smoke в реальном мини-аппе
- финальная релизная документация и деплой-конфиг
- дополнительные UX-детали для нескольких питомцев

## Чек-лист перед релизом

- см. `docs/release-checklist.md`
