"""Cálculo de estadísticas. Módulo PURO: no sabe nada de la BD ni de FastAPI.

Recibe estructuras simples (HabitSpec, conjuntos de fechas cumplidas...) y
devuelve resultados. Gracias a eso los tests no necesitan base de datos y
las reglas de negocio quedan en un único sitio.

Reglas importantes (las usan todas las funciones):

* Un hábito APLICA un día si ese día de la semana está en `weekdays`, es
  igual o posterior a su fecha de inicio y anterior a `archived_at`.
* Un día aplicable CUENTA para los porcentajes si ya ha pasado. El día de
  HOY solo cuenta si ya lo has cumplido: así el % no baja por la mañana
  solo porque el día aún no ha terminado.
* Rachas: los días que no aplican se saltan (no rompen la racha). Hoy sin
  marcar tampoco rompe la racha actual.
"""

import datetime as dt
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field

from app.core.dates import daterange, month_bounds

# Conjunto de pares (habit_id, fecha) en los que el hábito se cumplió.
DoneSet = set[tuple[int, dt.date]]


@dataclass(frozen=True)
class HabitSpec:
    """Lo mínimo que necesitan las estadísticas de un hábito."""

    id: int
    weekdays: frozenset[int]
    start_date: dt.date
    archived_at: dt.date | None = None
    # Datos de presentación; no influyen en los cálculos.
    name: str = ""
    color: str = "#888888"
    icon: str = ""


@dataclass
class Ratio:
    """Cumplidos sobre aplicables. `rate` es None si no había nada que cumplir."""

    done: int = 0
    applicable: int = 0

    @property
    def rate(self) -> float | None:
        return self.done / self.applicable if self.applicable else None

    def add(self, done: bool) -> None:
        self.applicable += 1
        self.done += int(done)


# --------------------------------------------------------------------------
# Reglas básicas
# --------------------------------------------------------------------------


def applies_on(habit: HabitSpec, day: dt.date) -> bool:
    """¿Le toca a este hábito el día `day`?"""
    if day < habit.start_date:
        return False
    if habit.archived_at is not None and day >= habit.archived_at:
        return False
    return day.weekday() in habit.weekdays


def counts_on(habit: HabitSpec, day: dt.date, done: DoneSet, today: dt.date) -> bool:
    """¿Entra este día en el denominador de los porcentajes?"""
    if not applies_on(habit, day) or day > today:
        return False
    if day == today:
        return (habit.id, day) in done
    return True


# --------------------------------------------------------------------------
# Resúmenes por día (calendario y heatmap)
# --------------------------------------------------------------------------


@dataclass
class DaySummary:
    date: dt.date
    done: int
    total: int


def day_summaries(
    habits: Iterable[HabitSpec], done: DoneSet, start: dt.date, end: dt.date
) -> list[DaySummary]:
    """Para cada día entre start y end: cuántos hábitos tocaban y cuántos se hicieron.

    Aquí NO se filtra por "hoy": el calendario muestra también los días futuros
    (con 0/N) y el frontend decide cómo pintarlos.
    """
    habits = list(habits)
    result = []
    for day in daterange(start, end):
        due = [h for h in habits if applies_on(h, day)]
        result.append(
            DaySummary(day, sum((h.id, day) in done for h in due), len(due))
        )
    return result


# --------------------------------------------------------------------------
# Rachas
# --------------------------------------------------------------------------


@dataclass
class Streaks:
    current: int = 0
    max: int = 0


def streaks(
    habit: HabitSpec, done: DoneSet, as_of: dt.date, today: dt.date | None = None
) -> Streaks:
    """Racha actual y máxima de un hábito, mirando la historia hasta `as_of`.

    `as_of` suele ser hoy, o el último día del mes si se consulta un mes pasado.
    `today` (por defecto = as_of) es el único día que, sin marcar, no rompe la racha.
    Se recorre la historia completa (no solo el mes), por eso las rachas
    cruzan de un mes a otro sin problema.
    """
    today = as_of if today is None else today
    end = as_of
    if habit.archived_at is not None:
        end = min(end, habit.archived_at - dt.timedelta(days=1))
    if end < habit.start_date:
        return Streaks()

    result = Streaks()
    running = 0
    for day in daterange(habit.start_date, end):
        if not applies_on(habit, day):
            continue  # días que no tocan: ni suman ni rompen
        if (habit.id, day) in done:
            running += 1
            result.max = max(result.max, running)
        elif day == today:
            # Hoy aún puede completarse: no rompe la racha.
            pass
        else:
            running = 0

    # Un hábito archivado no tiene racha "actual".
    is_archived = habit.archived_at is not None and habit.archived_at <= as_of
    result.current = 0 if is_archived else running
    return result


# --------------------------------------------------------------------------
# Peso
# --------------------------------------------------------------------------


@dataclass
class WeightPoint:
    date: dt.date
    weight_kg: float
    moving_avg_7d: float


def moving_average_7d(entries: Mapping[dt.date, float]) -> list[WeightPoint]:
    """Media móvil de 7 DÍAS DE CALENDARIO (el día y los 6 anteriores).

    Se promedian los registros que existan en esa ventana: si un día no te
    pesaste, la media usa los demás en lugar de mezclar semanas distintas.
    """
    ordered = sorted(entries.items())
    points = []
    for day, weight in ordered:
        window_start = day - dt.timedelta(days=6)
        window = [w for d, w in ordered if window_start <= d <= day]
        points.append(WeightPoint(day, weight, round(sum(window) / len(window), 2)))
    return points


@dataclass
class WeightChange:
    start: float | None = None
    end: float | None = None
    change: float | None = None
    entries: int = 0


def weight_change(entries: Mapping[dt.date, float], start: dt.date, end: dt.date) -> WeightChange:
    """Variación entre el primer y el último registro de peso dentro del rango."""
    in_range = sorted((d, w) for d, w in entries.items() if start <= d <= end)
    if not in_range:
        return WeightChange()
    first, last = in_range[0][1], in_range[-1][1]
    return WeightChange(first, last, round(last - first, 2), len(in_range))


# --------------------------------------------------------------------------
# Estadística mensual completa
# --------------------------------------------------------------------------


@dataclass
class HabitMonthStats:
    habit: HabitSpec
    ratio: Ratio
    streaks: Streaks


@dataclass
class MonthlyStats:
    month_start: dt.date
    month_end: dt.date
    habits: list[HabitMonthStats]
    overall: Ratio
    previous: Ratio
    weekdays: list[Ratio]  # índice 0 = lunes
    best_weekday: int | None
    worst_weekday: int | None
    weight: WeightChange
    heatmap: list[DaySummary] = field(default_factory=list)

    @property
    def overall_delta(self) -> float | None:
        """Diferencia de cumplimiento con el mes anterior (en tanto por uno)."""
        if self.overall.rate is None or self.previous.rate is None:
            return None
        return self.overall.rate - self.previous.rate


def _active_in_range(habit: HabitSpec, start: dt.date, end: dt.date) -> bool:
    """¿El periodo de vida del hábito se solapa con [start, end]?"""
    if habit.start_date > end:
        return False
    return habit.archived_at is None or habit.archived_at > start


def month_ratio(
    habits: Iterable[HabitSpec], done: DoneSet, start: dt.date, end: dt.date, today: dt.date
) -> Ratio:
    """Cumplimiento global (todos los hábitos juntos) en un rango de fechas."""
    ratio = Ratio()
    for habit in habits:
        for day in daterange(start, min(end, today)):
            if counts_on(habit, day, done, today):
                ratio.add((habit.id, day) in done)
    return ratio


def monthly_stats(
    month_start: dt.date,
    habits: Iterable[HabitSpec],
    done: DoneSet,
    weights: Mapping[dt.date, float],
    today: dt.date,
) -> MonthlyStats:
    """Calcula todas las estadísticas de un mes.

    `done` debe incluir la historia anterior al mes si se quieren rachas
    correctas (una racha puede empezar meses atrás).
    """
    start, end = month_bounds(month_start)
    habits = list(habits)
    # Para un mes pasado las rachas se calculan "a final de ese mes".
    as_of = min(end, today)
    last_counted = min(end, today)

    per_habit: list[HabitMonthStats] = []
    weekday_ratios = [Ratio() for _ in range(7)]
    overall = Ratio()

    for habit in habits:
        if not _active_in_range(habit, start, end):
            continue
        ratio = Ratio()
        for day in daterange(start, last_counted):
            if counts_on(habit, day, done, today):
                is_done = (habit.id, day) in done
                ratio.add(is_done)
                weekday_ratios[day.weekday()].add(is_done)
                overall.add(is_done)
        per_habit.append(HabitMonthStats(habit, ratio, streaks(habit, done, as_of, today)))

    # Mejor / peor día de la semana: solo entre los que tienen datos.
    with_data = [(i, r.rate) for i, r in enumerate(weekday_ratios) if r.rate is not None]
    best = max(with_data, key=lambda x: x[1])[0] if with_data else None
    worst = min(with_data, key=lambda x: x[1])[0] if with_data else None

    prev_start, prev_end = month_bounds(start - dt.timedelta(days=1))
    previous = month_ratio(habits, done, prev_start, prev_end, today)

    return MonthlyStats(
        month_start=start,
        month_end=end,
        habits=per_habit,
        overall=overall,
        previous=previous,
        weekdays=weekday_ratios,
        best_weekday=best,
        worst_weekday=worst,
        weight=weight_change(weights, start, end),
        heatmap=day_summaries(habits, done, start, end),
    )
