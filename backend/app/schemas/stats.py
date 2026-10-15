import datetime as dt

from pydantic import BaseModel

from app.schemas.day import DaySummaryRead


class RatioRead(BaseModel):
    done: int
    applicable: int
    rate: float | None  # tanto por uno (0.75 = 75 %); None si no había nada que cumplir


class HabitStatsRead(RatioRead):
    habit_id: int
    name: str
    color: str
    icon: str
    archived: bool
    current_streak: int
    max_streak: int


class WeekdayStatsRead(RatioRead):
    weekday: int  # 0 = lunes


class PreviousMonthRead(RatioRead):
    month: str


class WeightChangeRead(BaseModel):
    start: float | None
    end: float | None
    change: float | None
    entries: int


class MonthlyStatsRead(BaseModel):
    month: str
    start: dt.date
    end: dt.date
    overall: RatioRead
    previous: PreviousMonthRead
    overall_delta: float | None  # diferencia con el mes anterior (tanto por uno)
    habits: list[HabitStatsRead]
    weekdays: list[WeekdayStatsRead]
    best_weekday: int | None
    worst_weekday: int | None
    weight: WeightChangeRead
    heatmap: list[DaySummaryRead]
