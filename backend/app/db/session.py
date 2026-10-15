"""Motor de base de datos y fábrica de sesiones."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()

# check_same_thread=False: FastAPI puede usar la conexión desde varios hilos.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _record) -> None:
    """SQLite NO comprueba claves foráneas salvo que se active en cada conexión."""
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# expire_on_commit=False: tras un commit podemos seguir leyendo los atributos
# del objeto (útil para devolverlo en la respuesta sin otra consulta).
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
