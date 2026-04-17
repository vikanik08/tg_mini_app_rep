# Frontend

Клиентская часть Telegram Mini App на `React + TypeScript + Vite`.

## Что уже работает

- live dashboard на главном экране
- live calendar по месяцу и выбранному дню
- паспорт питомца по маршруту с `petId`
- создание и редактирование питомца
- сохранение процедур через `events`
- профиль пользователя

## Переменные окружения

Базовые значения лежат в `frontend/.env.example`.

Основные переменные:

- `VITE_API_URL=http://localhost:8000`
- `VITE_USE_DEV_LOGIN=true`
- `VITE_DEV_TELEGRAM_ID=999999999`

Для локальных переопределений используй `frontend/.env.local`.

## Локальный запуск

1. Убедиться, что backend уже поднят:

```powershell
curl http://localhost:8000/health
```

2. Установить зависимости и запустить dev-сервер:

```powershell
npm install
npm run dev
```

3. Открыть:

```text
http://localhost:5173
```

## Полезные команды

```powershell
npm run dev
npm run lint
npm run build
npm run preview
```

## Основные маршруты

- `/` - dashboard
- `/calendar` - календарь
- `/passport` - редирект на активного питомца или форму создания
- `/passport/:petId` - паспорт питомца
- `/passport/:petId/edit` - редактирование питомца
- `/procedure/:type/:petId` - процедура для конкретного питомца
- `/profile` - профиль пользователя

## Перед выкладкой

- общий release checklist лежит в `../docs/release-checklist.md`
