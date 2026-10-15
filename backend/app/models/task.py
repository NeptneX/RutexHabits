import datetime as dt

from sqlalchemy import Boolean, Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Task(Base):
    """Tarea puntual asociada a un día (no recurrente)."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    date: Mapped[dt.date] = mapped_column(Date, index=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
