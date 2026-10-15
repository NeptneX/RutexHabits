"""Punto de entrada de la API.

Arranque en desarrollo (desde backend/):
    uvicorn app.main:app --reload
Documentación interactiva: http://127.0.0.1:8000/docs
"""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import days, habits, stats, tasks, weight
from app.core.config import get_settings


def create_app() -> FastAPI:
    """Fábrica de la aplicación: facilita crear instancias limpias (p. ej. en tests)."""
    settings = get_settings()
    app = FastAPI(
        title="Habit Tracker API",
        description="API personal para seguir hábitos, tareas y peso corporal.",
        version="0.1.0",
    )

    # CORS: el frontend (Vite, puerto 5173) es otro "origen" distinto de la API
    # (puerto 8000), así que el navegador bloquearía las peticiones sin esto.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Todas las rutas cuelgan de /api. Si algún día añadimos autenticación,
    # basta con `dependencies=[Depends(get_current_user)]` en este router.
    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["sistema"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    for module in (habits, tasks, weight, days, stats):
        api.include_router(module.router)
    app.include_router(api)
    return app


app = create_app()
