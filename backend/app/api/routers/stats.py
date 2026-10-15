"""Estadísticas. Este router solo carga datos y da forma a la respuesta;
todos los cálculos viven en app/services/stats.py."""

import datetime as dt

from fastapi import APIRouter

from app.api.deps import DbSession, Month, Today
from app.core.dates import month_bounds
from app.schemas.day import DaySummaryRead
from app.schemas.stats import (
    HabitStatsRead,
    MonthlyStatsRead,
    PreviousMonthRead,
    RatioRead,
    WeekdayStatsRead,
    WeightChangeRead,
)
from app.services.habits import load_done_set, load_habit_specs, load_weights
from app.services.stats import Ratio, monthly_stats

router = APIRouter(prefix="/stats", tags=["estadísticas"])


def _ratio(r: Ratio) -> dict:
    return {"done": r.done, "applicable": r.applicable, "rate": r.rate}


@router.get("/monthly", response_model=MonthlyStatsRead)
def get_monthly_stats(month: Month, db: DbSession, today: Today):
    start, end = month_bounds(month)
    # Cargamos TODA la historia de registros hasta fin de mes: las rachas
    # pueden venir de meses anteriores. Para uso personal es poco volumen.
    done = load_done_set(db, end=end)
    stats = monthly_stats(start, load_habit_specs(db), done, load_weights(db, start, end), today)

    previous_month = month_bounds(start - dt.timedelta(days=1))[0]
    return MonthlyStatsRead(
        month=start.strftime("%Y-%m"),
        start=start,
        end=end,
        overall=RatioRead(**_ratio(stats.overall)),
        previous=PreviousMonthRead(month=previous_month.strftime("%Y-%m"), **_ratio(stats.previous)),
        overall_delta=stats.overall_delta,
        habits=[
            HabitStatsRead(
                habit_id=h.habit.id,
                name=h.habit.name,
                color=h.habit.color,
                icon=h.habit.icon,
                archived=h.habit.archived_at is not None and h.habit.archived_at <= today,
                current_streak=h.streaks.current,
                max_streak=h.streaks.max,
                **_ratio(h.ratio),
            )
            for h in stats.habits
        ],
        weekdays=[WeekdayStatsRead(weekday=i, **_ratio(r)) for i, r in enumerate(stats.weekdays)],
        best_weekday=stats.best_weekday,
        worst_weekday=stats.worst_weekday,
        weight=WeightChangeRead(**vars(stats.weight)),
        heatmap=[DaySummaryRead(date=d.date, done=d.done, total=d.total) for d in stats.heatmap],
    )
