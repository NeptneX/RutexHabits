import datetime as dt
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import ORMModel

WeightKg = Annotated[float, Field(gt=20, lt=400, description="Peso en kilogramos")]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]

# Rangos permitidos en la gráfica de peso (en meses).
ALLOWED_RANGES = (1, 3, 6, 12)


def _check_range(value: int) -> int:
    if value not in ALLOWED_RANGES:
        raise ValueError(f"months debe ser uno de {ALLOWED_RANGES}")
    return value


# Ojo: no usamos Literal[1, 3, 6, 12] porque en la query llega el texto "1"
# y Pydantic no lo convierte a un literal numérico. int + validador sí funciona.
RangeMonths = Annotated[int, AfterValidator(_check_range)]


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
