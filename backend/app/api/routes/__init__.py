from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.pets import router as pets_router
from app.api.routes.events import router as events_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.calendar import router as calendar_router
from app.api.routes.health_checks import router as health_checks_router
from app.api.routes.dev import router as dev_router
from app.api.routes.users import router as users_router
from app.api.routes.admin import router as admin_router
from app.api.routes.import_data import router as import_data_router
from app.api.routes.promos import router as promos_router
from app.api.routes.telegram import router as telegram_router

def get_routers():
    return [
        health_router,
        auth_router,
        pets_router,
        events_router,
        dashboard_router,
        calendar_router,
        health_checks_router,
        users_router,
        promos_router,
        telegram_router,
        admin_router,
        import_data_router,
        dev_router
    ]
