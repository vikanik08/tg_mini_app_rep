# Deploy To Amvera

This project is prepared to keep the frontend on Vercel and move only the backend API to Amvera.

## What Is Included

- `amvera.yaml` in the repository root for Amvera deployment
- `amvera/Dockerfile` that builds the backend from the monorepo root

The standard local Docker setup in `docker-compose.yml` stays unchanged.

## Recommended Topology

1. Keep `frontend` on Vercel.
2. Create a PostgreSQL project in Amvera.
3. Create an application project in Amvera from this repository.
4. Point the backend project to the repository root.
5. Let Amvera use the root `amvera.yaml`.

## Environment Variables In Amvera

Set these variables in the Amvera backend project:

```text
APP_ROLE=backend
APP_NAME=TG MiniApp API
ENV=prod
DEBUG=false
ALLOW_DEV_LOGIN=false
RUN_NOTIFICATION_WORKER=true
ACCESS_TOKEN_EXPIRE_MINUTES=10080
JWT_SECRET=<strong-random-secret>
JWT_ALG=HS256
DATABASE_URL=<amvera-postgres-connection-string>
TELEGRAM_BOT_TOKEN=<telegram-bot-token>
VK_APP_ID=<vk-app-id>
VK_APP_SECRET=<vk-protected-key>
ADMIN_SECRET=<admin-secret>
CORS_ORIGINS=https://tg-miniapp-sand.vercel.app
```

If you already have a production frontend domain, add it to `CORS_ORIGINS` as a comma-separated list.

Example:

```text
CORS_ORIGINS=https://tg-miniapp-sand.vercel.app,https://miniapp.example.com
```

## Optional Frontend On Amvera

If mobile clients cannot open the Vercel domain, create a second Amvera application from the same repository and branch.

Use the same root `amvera.yaml`, but set only these runtime variables for the frontend application:

```text
APP_ROLE=frontend
```

The Docker image builds the Vite frontend with:

```text
VITE_API_URL=https://smartpet-lunyc.amvera.io
VITE_USE_DEV_LOGIN=false
VITE_PLATFORM_TARGET=auto
```

After Amvera gives the frontend application a public domain, add that domain to the backend `CORS_ORIGINS`.

Example:

```text
CORS_ORIGINS=https://tg-miniapp-sand.vercel.app,https://smartpet-front-lunyc.amvera.io
```

Then use the new frontend domain in Telegram BotFather and VK Mini App settings.

## Database Notes

- Create a managed PostgreSQL project in Amvera.
- Use its connection string as `DATABASE_URL`.
- The backend normalizes `postgresql://...` into the SQLAlchemy psycopg format automatically.

## First Deploy Checklist

1. Push the repository with `amvera.yaml` and `amvera/Dockerfile`.
2. Create the PostgreSQL project in Amvera.
3. Create the backend application in Amvera from this repository.
4. Add all environment variables.
5. Run the first build and start.
6. Check `GET /health`.
7. Update frontend `VITE_API_URL` to the new Amvera backend URL.
8. Redeploy the frontend on Vercel.

## Reminder Delivery

For the first migration, reminders can run in the main backend process via:

```text
RUN_NOTIFICATION_WORKER=true
```

This is the simplest replacement for the old Render setup.

If you later want stricter isolation, Amvera also has Cron Jobs that can run reminder processing separately.

## Why A Separate Dockerfile Is Needed

The existing local backend Dockerfile assumes the Docker build context is `./backend`.
Amvera builds from the repository root, so it needs a dedicated Dockerfile that copies only the backend folder into the container.
