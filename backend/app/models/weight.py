import datetime as dt

from sqlalchemy import CheckConstraint, Date, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WeightEntry(Base):
    """Peso corporal de un día. La fecha es única: máximo un peso por día."""

    __tablename__ = "weight_entries"
    __table_args__ = (CheckConstraint("weight_kg > 0", name="weight_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[dt.date] = mapped_column(Date, unique=True, index=True)
    weight_kg: Mapped[float] = mapped_column(Float)
    note: Mapped[str | None] = mapped_column(String(200), default=None)
