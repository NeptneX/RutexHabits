"""Vistas agregadas: un día completo y el resumen del calendario mensual."""

import datetime as dt

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession, Month, Today
from app.core.dates import month_bounds
from app.models import Habit, Task, WeightEntry
from app.schemas.day import CalendarRead, DayHabit, DayRead, DaySummaryRead
from app.services.habits import load_done_set, load_habit_specs, to_spec
from app.services.stats import applies_on, day_summaries

router = APIRouter(tags=["días"])


@router.get("/days/{day}", response_model=DayRead)
def get_day(day: dt.date, db: DbSession, today: Today):
    """Todo lo de un día: hábitos que tocan (con su estado), tareas y peso."""
    habits = db.scalars(select(Habit).order_by(Habit.id)).all()
    due = [h for h in habits if applies_on(to_spec(h), day)]
    done = load_done_set(db, day, day)

    day_habits = [
        DayHabit(id=h.id, name=h.name, color=h.color, icon=h.icon, archived=h.archived, done=(h.id, day) in done)
        for h in due
    ]
    tasks = db.scalars(select(Task).where(Task.date == day).order_by(Task.id)).all()
    weight = db.scalar(select(WeightEntry).where(WeightEntry.date == day))

    return DayRead(
        date=day,
        can_log=day <= today,
        summary=DaySummaryRead(date=day, done=sum(h.done for h in day_habits), total=len(day_habits)),
        habits=day_habits,
        tasks=tasks,
        weight=weight,
    )


@router.get("/calendar", response_model=CalendarRead)
def get_calendar(month: Month, db: DbSession):
    """Para cada día del mes: hábitos cumplidos / hábitos que tocaban."""
    start, end = month_bounds(month)
    summaries = day_summaries(load_habit_specs(db), load_done_set(db, start, end), start, end)
    return CalendarRead(
        month=start.strftime("%Y-%m"),
        days=[DaySummaryRead(date=s.date, done=s.done, total=s.total) for s in summaries],
    )
