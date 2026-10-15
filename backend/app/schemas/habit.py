import datetime as dt
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.schemas.common import ORMModel, PatchModel

# Tipos reutilizables con sus restricciones (Annotated = tipo + metadatos).
HabitName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]
Icon = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=16)]
Weekdays = Annotated[list[Annotated[int, Field(ge=0, le=6)]], Field(min_length=1, max_length=7)]


def _normalize_weekdays(value: list[int] | None) -> list[int] | None:
    """Quita duplicados y ordena: [4, 0, 0] -> [0, 4]."""
    return sorted(set(value)) if value is not None else None


class HabitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: HabitName
    color: HexColor = "#6366f1"
    icon: Icon = "✅"
    weekdays: Weekdays = Field(default_factory=lambda: list(range(7)))
    # Opcional: permite dar de alta un hábito "desde" una fecha pasada
    # para poder registrar días anteriores. Por defecto, hoy.
    start_date: dt.date | None = None

    @field_validator("weekdays")
    @classmethod
    def _normalize(cls, value):
        return _normalize_weekdays(value)


class HabitUpdate(PatchModel):
    name: HabitName | None = None
    color: HexColor | None = None
    icon: Icon | None = None
    weekdays: Weekdays | None = None
    # true = archivar desde hoy; false = desarchivar.
    archived: bool | None = None

    @field_validator("weekdays")
    @classmethod
    def _normalize(cls, value):
        return _normalize_weekdays(value)


class HabitRead(ORMModel):
    id: int
    name: str
    color: str
    icon: str
    weekdays: list[int]
    created_at: dt.datetime
    archived_at: dt.date | None
    archived: bool


class HabitLogUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")
    done: bool


class HabitLogRead(ORMModel):
    habit_id: int
    date: dt.date
    done: bool
