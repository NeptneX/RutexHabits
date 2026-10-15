import datetime as dt

from pydantic import BaseModel

from app.schemas.task import TaskRead
from app.schemas.weight import WeightRead


class DayHabit(BaseModel):
    id: int
    name: str
    color: str
    icon: str
    archived: bool
    done: bool


class DaySummaryRead(BaseModel):
    date: dt.date
    done: int
    total: int


class DayRead(BaseModel):
    date: dt.date
    # False en días futuros: el frontend deshabilita los checkboxes de hábitos.
    can_log: bool
    summary: DaySummaryRead
    habits: list[DayHabit]
    tasks: list[TaskRead]
    weight: WeightRead | None


class CalendarRead(BaseModel):
    month: str
    days: list[DaySummaryRead]
