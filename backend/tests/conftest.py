"""Fixtures compartidas por los tests de la API.

Cada test obtiene una BD SQLite en memoria NUEVA (aislamiento total) y una
fecha "de hoy" fija, gracias a `app.dependency_overrides`.
"""

import datetime as dt

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.api.deps import get_db, get_today
from app.db.base import Base
from app.main import create_app

TODAY = dt.date(2026, 10, 15)  # jueves


@pytest.fixture
def db_session():
    # StaticPool + ":memory:": todas las conexiones comparten la misma BD en memoria.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db_session):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_today] = lambda: TODAY
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_habit(client):
    """Crea un hábito por la API y devuelve el JSON. Admite sobreescribir campos."""

    def _make(**overrides):
        payload = {"name": "Leer", "color": "#22c55e", "icon": "📚", "weekdays": list(range(7))}
        payload.update(overrides)
        response = client.post("/api/habits", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make
