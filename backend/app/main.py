import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.api.routes import get_routers
from app.core.config import settings
from app.services.notifications import notification_worker
from app.services.telegram_bot import telegram_bot_polling_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    tasks: list[asyncio.Task[None]] = []

    if settings.telegram_bot_token and settings.run_notification_worker:
        tasks.append(asyncio.create_task(notification_worker()))

    if settings.telegram_bot_token and settings.run_telegram_bot_polling:
        tasks.append(asyncio.create_task(telegram_bot_polling_worker()))

    try:
        yield
    finally:
        for task in tasks:
            task.cancel()

        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


if settings.cors_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for r in get_routers():
    app.include_router(r)


frontend_dist = Path("/frontend/dist")
index_headers = {"Cache-Control": "no-store, max-age=0"}

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/")
    async def serve_frontend_root():
        return FileResponse(frontend_dist / "index.html", headers=index_headers)

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        requested_file = (frontend_dist / full_path).resolve()
        dist_root = frontend_dist.resolve()

        if str(requested_file).startswith(str(dist_root)) and requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(frontend_dist / "index.html", headers=index_headers)
