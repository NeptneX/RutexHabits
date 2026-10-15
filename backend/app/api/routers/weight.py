"""Registro de peso corporal. La fecha actúa como identificador (único por día)."""

import datetime as dt

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import DbSession, Today
from app.core.dates import add_months
from app.models import WeightEntry
from app.schemas.weight import RangeMonths, WeightPointRead, WeightRead, WeightSeries, WeightUpsert
from app.services.habits import load_weights
from app.services.stats import moving_average_7d

router = APIRouter(prefix="/weight", tags=["peso"])


@router.get("", response_model=WeightSeries)
def weight_series(db: DbSession, today: Today, months: RangeMonths = 3):
    """Pesos de los últimos `months` meses con su media móvil de 7 días."""
    start = add_months(today, -months)
    # Cargamos 6 días extra para que la media de los primeros puntos sea completa.
    weights = load_weights(db, start - dt.timedelta(days=6), today)
    notes = dict(
        db.execute(select(WeightEntry.date, WeightEntry.note).where(WeightEntry.date >= start)).all()
    )
    points = [
        WeightPointRead(date=p.date, weight_kg=p.weight_kg, note=notes.get(p.date), moving_avg_7d=p.moving_avg_7d)
        for p in moving_average_7d(weights)
        if p.date >= start
    ]
    return WeightSeries(months=months, start=start, end=today, entries=points)


@router.get("/{day}", response_model=WeightRead)
def get_weight(day: dt.date, db: DbSession):
    entry = db.scalar(select(WeightEntry).where(WeightEntry.date == day))
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No hay peso registrado ese día")
    return entry


@router.put("/{day}", response_model=WeightRead)
def upsert_weight(day: dt.date, payload: WeightUpsert, db: DbSession, today: Today, response: Response):
    """Crea (201) o actualiza (200) el peso de un día."""
    if day > today:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No se puede registrar peso en el futuro")
    entry = db.scalar(select(WeightEntry).where(WeightEntry.date == day))
    if entry is None:
        entry = WeightEntry(date=day, **payload.model_dump())
        db.add(entry)
        response.status_code = status.HTTP_201_CREATED
    else:
        entry.weight_kg = payload.weight_kg
        entry.note = payload.note
    db.commit()
    return entry


@router.delete("/{day}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(day: dt.date, db: DbSession):
    entry = db.scalar(select(WeightEntry).where(WeightEntry.date == day))
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No hay peso registrado ese día")
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
