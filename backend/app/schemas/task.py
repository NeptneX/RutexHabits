import datetime as dt
from typing import Annotated, ClassVar

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.schemas.common import ORMModel, PatchModel

TaskTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Notes = Annotated[str, StringConstraints(max_length=2000)]


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: TaskTitle
    date: dt.date
    notes: Notes | None = None
    done: bool = False


class TaskUpdate(PatchModel):
    NULLABLE: ClassVar[frozenset[str]] = frozenset({"notes"})  # se puede borrar la nota enviando null

    title: TaskTitle | None = None
    date: dt.date | None = None
    notes: Notes | None = None
    done: bool | None = None


class TaskRead(ORMModel):
    id: int
    title: str
    date: dt.date
    done: bool
    notes: str | None
