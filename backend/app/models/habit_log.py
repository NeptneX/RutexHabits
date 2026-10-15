import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.habit import Habit


class HabitLog(Base):
    """Registro de si un hábito se cumplió un día concreto."""

    __tablename__ = "habit_logs"
    # Como mucho un registro por hábito y día: la BD lo garantiza aunque
    # el código tuviera un fallo.
    __table_args__ = (UniqueConstraint("habit_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habits.id", ondelete="CASCADE"), index=True)
    date: Mapped[dt.date] = mapped_column(Date, index=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)

    habit: Mapped["Habit"] = relationship(back_populates="logs")
