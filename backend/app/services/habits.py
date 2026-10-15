"""Acceso a datos de hábitos: traduce modelos SQLAlchemy a estructuras de `stats`.

Separar esto de `stats.py` mantiene las estadísticas como funciones puras:
este módulo hace las consultas y `stats.py` hace las cuentas.
"""

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Habit, HabitLog, WeightEntry
from app.services.stats import DoneSet, HabitSpec


def to_spec(habit: Habit) -> HabitSpec:
    return HabitSpec(
        id=habit.id,
        weekdays=frozenset(habit.weekdays),
        start_date=habit.start_date,
        archived_at=habit.archived_at,
        name=habit.name,
        color=habit.color,
        icon=habit.icon,
    )


def load_habit_specs(db: Session) -> list[HabitSpec]:
    """Todos los hábitos (también los archivados: cuentan en su periodo activo)."""
    habits = db.scalars(select(Habit).order_by(Habit.id)).all()
    return [to_spec(h) for h in habits]


def load_done_set(db: Session, start: dt.date | None = None, end: dt.date | None = None) -> DoneSet:
    """Pares (habit_id, fecha) marcados como hechos, opcionalmente en un rango."""
    stmt = select(HabitLog.habit_id, HabitLog.date).where(HabitLog.done.is_(True))
    if start is not None:
        stmt = stmt.where(HabitLog.date >= start)
    if end is not None:
        stmt = stmt.where(HabitLog.date <= end)
    return {(habit_id, day) for habit_id, day in db.execute(stmt)}


def load_weights(db: Session, start: dt.date | None = None, end: dt.date | None = None) -> dict[dt.date, float]:
    stmt = select(WeightEntry.date, WeightEntry.weight_kg)
    if start is not None:
        stmt = stmt.where(WeightEntry.date >= start)
    if end is not None:
        stmt = stmt.where(WeightEntry.date <= end)
    return {day: weight for day, weight in db.execute(stmt)}
