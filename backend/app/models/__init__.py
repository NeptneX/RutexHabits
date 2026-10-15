"""Importar aquí todos los modelos garantiza que Base.metadata los conozca
(lo necesitan Alembic y los tests al crear las tablas)."""

from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.task import Task
from app.models.weight import WeightEntry

__all__ = ["Habit", "HabitLog", "Task", "WeightEntry"]
