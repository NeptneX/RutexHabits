"""Endpoints de hábitos y de sus registros diarios.

No existe DELETE: los hábitos se archivan para no perder estadísticas.
FastAPI responde 405 (Method Not Allowed) automáticamente a un DELETE.
"""

import datetime as dt

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, Today
from app.models import Habit, HabitLog
from app.schemas.habit import HabitCreate, HabitLogRead, HabitLogUpsert, HabitRead, HabitUpdate
from app.services.habits import to_spec
from app.services.stats import applies_on

router = APIRouter(prefix="/habits", tags=["hábitos"])


def _get_or_404(db: DbSession, habit_id: int) -> Habit:
    habit = db.get(Habit, habit_id)
    if habit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hábito no encontrado")
    return habit


@router.get("", response_model=list[HabitRead])
def list_habits(db: DbSession, include_archived: bool = False):
    stmt = select(Habit).order_by(Habit.id)
    if not include_archived:
        stmt = stmt.where(Habit.archived_at.is_(None))
    return db.scalars(stmt).all()


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(payload: HabitCreate, db: DbSession, today: Today):
    start = payload.start_date or today
    if start > today:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "start_date no puede ser futura")
    habit = Habit(
        name=payload.name,
        color=payload.color,
        icon=payload.icon,
        weekdays=payload.weekdays,
        # Si la fecha es hoy guardamos la hora real; si es pasada, medianoche.
        created_at=dt.datetime.now() if start == today else dt.datetime.combine(start, dt.time()),
    )
    db.add(habit)
    db.commit()
    return habit


@router.get("/{habit_id}", response_model=HabitRead)
def get_habit(habit_id: int, db: DbSession):
    return _get_or_404(db, habit_id)


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(habit_id: int, payload: HabitUpdate, db: DbSession, today: Today):
    habit = _get_or_404(db, habit_id)
    # exclude_unset: solo los campos que el cliente envió de verdad.
    data = payload.model_dump(exclude_unset=True)

    archived = data.pop("archived", None)
    if archived is True and habit.archived_at is None:
        habit.archived_at = today  # desde hoy deja de aplicar
    elif archived is False:
        habit.archived_at = None

    for field, value in data.items():
        setattr(habit, field, value)
    db.commit()
    return habit


@router.get("/{habit_id}/logs", response_model=list[HabitLogRead])
def list_logs(
    habit_id: int,
    db: DbSession,
    start: dt.date | None = None,
    end: dt.date | None = None,
):
    _get_or_404(db, habit_id)
    stmt = select(HabitLog).where(HabitLog.habit_id == habit_id).order_by(HabitLog.date)
    if start:
        stmt = stmt.where(HabitLog.date >= start)
    if end:
        stmt = stmt.where(HabitLog.date <= end)
    return db.scalars(stmt).all()


@router.put("/{habit_id}/logs/{day}", response_model=HabitLogRead)
def upsert_log(habit_id: int, day: dt.date, payload: HabitLogUpsert, db: DbSession, today: Today):
    """Marca o desmarca un hábito un día. Es idempotente (PUT): repetir la
    misma petición deja el mismo estado."""
    habit = _get_or_404(db, habit_id)
    if day > today:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No se pueden registrar días futuros")
    if not applies_on(to_spec(habit), day):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "El hábito no aplica ese día (día de la semana, antes de su creación o archivado)",
        )

    log = db.scalar(select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == day))
    if log is None:
        log = HabitLog(habit_id=habit_id, date=day, done=payload.done)
        db.add(log)
    else:
        log.done = payload.done
    db.commit()
    return log
