import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.habit_log import HabitLog


class Habit(Base):
    """Un hábito recurrente (estudiar, gimnasio...).

    Nunca se borra: se archiva rellenando `archived_at`. Así sus registros
    históricos siguen contando en las estadísticas de meses pasados.
    """

    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    color: Mapped[str] = mapped_column(String(7))  # "#RRGGBB"
    icon: Mapped[str] = mapped_column(String(16))  # emoji (puede ocupar varios code points)
    # Lista de días de la semana en que aplica: 0 = lunes ... 6 = domingo
    # (igual que date.weekday() en Python). Se guarda como JSON: legible y simple.
    weekdays: Mapped[list[int]] = mapped_column(JSON)
    # Hora LOCAL del servidor (no UTC): "hoy" en toda la app es la fecha local.
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.now)
    # Primer día en que el hábito YA NO aplica. None = activo.
    archived_at: Mapped[dt.date | None] = mapped_column(Date, default=None)

    logs: Mapped[list["HabitLog"]] = relationship(
        back_populates="habit", cascade="all, delete-orphan", lazy="raise"
    )

    @property
    def archived(self) -> bool:
        return self.archived_at is not None

    @property
    def start_date(self) -> dt.date:
        """Primer día en que el hábito cuenta para las estadísticas."""
        return self.created_at.date()
