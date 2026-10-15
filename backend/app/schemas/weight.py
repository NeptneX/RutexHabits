import datetime as dt
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import ORMModel

WeightKg = Annotated[float, Field(gt=20, lt=400, description="Peso en kilogramos")]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]

# Rangos permitidos en la gráfica de peso (en meses).
RangeMonths = Literal[1, 3, 6, 12]


class WeightUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weight_kg: WeightKg
    note: Note | None = None


class WeightRead(ORMModel):
    date: dt.date
    weight_kg: float
    note: str | None


class WeightPointRead(WeightRead):
    moving_avg_7d: float


class WeightSeries(BaseModel):
    months: int
    start: dt.date
    end: dt.date
    entries: list[WeightPointRead]
