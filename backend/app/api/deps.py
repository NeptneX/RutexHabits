"""Dependencias inyectables con `Depends(...)`.

La inyección de dependencias es clave para que la app sea testeable y
extensible:
* En los tests sustituimos `get_db` por una BD en memoria y `get_today` por
  una fecha fija (app.dependency_overrides), sin tocar el código de la API.
* Para añadir autenticación bastará con crear aquí `get_current_user`
  (leyendo un token de la cabecera) y añadirlo como dependencia en los
  routers. Ningún endpoint necesita cambiar su lógica.
"""

import datetime as dt
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dates import parse_month
from app.db.session import SessionLocal


def get_db() -> Iterator[Session]:
    """Abre una sesión por petición y la cierra siempre al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_today() -> dt.date:
    """Fecha "de hoy" (hora local). Centralizarla permite fijarla en los tests."""
    return dt.date.today()


def month_query(
    month: Annotated[str, Query(description="Mes en formato YYYY-MM", examples=["2026-10"])],
) -> dt.date:
    """Valida el parámetro ?month=YYYY-MM y devuelve el primer día del mes."""
    try:
        return parse_month(month)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc


# Alias para no repetir `Annotated[..., Depends(...)]` en cada endpoint.
DbSession = Annotated[Session, Depends(get_db)]
Today = Annotated[dt.date, Depends(get_today)]
Month = Annotated[dt.date, Depends(month_query)]
