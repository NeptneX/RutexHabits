"""Tests unitarios de app/services/stats.py.

No usan base de datos: construimos HabitSpec y conjuntos de fechas a mano.
Fechas de referencia: octubre de 2026 empieza en jueves (1-oct-2026).
"""

import datetime as dt

import pytest

from app.services.stats import (
    HabitSpec,
    applies_on,
    counts_on,
    day_summaries,
    month_ratio,
    monthly_stats,
    moving_average_7d,
    streaks,
    weight_change,
)

D = dt.date
EVERY_DAY = frozenset(range(7))
MON_WED_FRI = frozenset({0, 2, 4})


def habit(id=1, weekdays=EVERY_DAY, start=D(2026, 1, 1), archived_at=None) -> HabitSpec:
    return HabitSpec(id=id, weekdays=weekdays, start_date=start, archived_at=archived_at)


def done_on(habit_id: int, *days: dt.date) -> set:
    return {(habit_id, d) for d in days}


def days_between(start: dt.date, end: dt.date) -> list[dt.date]:
    return [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]


# ---------------------------------------------------------------- applies_on


class TestAppliesOn:
    def test_respects_weekdays(self):
        h = habit(weekdays=MON_WED_FRI)
        assert applies_on(h, D(2026, 10, 5))  # lunes
        assert not applies_on(h, D(2026, 10, 6))  # martes

    def test_not_before_creation(self):
        h = habit(start=D(2026, 10, 10))
        assert not applies_on(h, D(2026, 10, 9))
        assert applies_on(h, D(2026, 10, 10))

    def test_not_from_archive_date(self):
        h = habit(archived_at=D(2026, 10, 10))
        assert applies_on(h, D(2026, 10, 9))
        assert not applies_on(h, D(2026, 10, 10))


class TestCountsOn:
    def test_future_days_never_count(self):
        assert not counts_on(habit(), D(2026, 10, 20), set(), today=D(2026, 10, 15))

    def test_today_only_counts_if_done(self):
        today = D(2026, 10, 15)
        assert not counts_on(habit(), today, set(), today)
        assert counts_on(habit(), today, done_on(1, today), today)

    def test_past_day_counts_even_if_not_done(self):
        assert counts_on(habit(), D(2026, 10, 14), set(), today=D(2026, 10, 15))


# ---------------------------------------------------------------- rachas


class TestStreaks:
    def test_no_data(self):
        s = streaks(habit(), set(), as_of=D(2026, 10, 15))
        assert (s.current, s.max) == (0, 0)

    def test_simple_current_and_max(self):
        h = habit(start=D(2026, 10, 1))
        done = done_on(1, *days_between(D(2026, 10, 1), D(2026, 10, 5)))  # 5 seguidos
        done |= done_on(1, D(2026, 10, 7), D(2026, 10, 8))  # el 6 se rompe
        s = streaks(h, done, as_of=D(2026, 10, 8))
        assert (s.current, s.max) == (2, 5)

    def test_today_pending_does_not_break_current(self):
        h = habit(start=D(2026, 10, 1))
        done = done_on(1, D(2026, 10, 12), D(2026, 10, 13), D(2026, 10, 14))
        s = streaks(h, done, as_of=D(2026, 10, 15))
        assert s.current == 3

    def test_missed_yesterday_breaks_current(self):
        h = habit(start=D(2026, 10, 1))
        done = done_on(1, D(2026, 10, 12), D(2026, 10, 13))
        assert streaks(h, done, as_of=D(2026, 10, 15)).current == 0

    def test_non_applicable_days_do_not_break(self):
        # L-X-V: lun 5, mié 7, vie 9, lun 12 -> 4 seguidos aunque haya huecos
        h = habit(weekdays=MON_WED_FRI, start=D(2026, 10, 1))
        done = done_on(1, D(2026, 10, 5), D(2026, 10, 7), D(2026, 10, 9), D(2026, 10, 12))
        s = streaks(h, done, as_of=D(2026, 10, 13))  # martes: no aplica
        assert (s.current, s.max) == (4, 4)

    def test_streak_crosses_months(self):
        h = habit(start=D(2026, 9, 1))
        done = done_on(1, *days_between(D(2026, 9, 25), D(2026, 10, 3)))  # 9 días
        s = streaks(h, done, as_of=D(2026, 10, 3))
        assert (s.current, s.max) == (9, 9)

    def test_past_month_end_not_done_breaks(self):
        # Consultando "a fin de septiembre" desde octubre, el 30 sin hacer rompe.
        h = habit(start=D(2026, 9, 1))
        done = done_on(1, D(2026, 9, 28), D(2026, 9, 29))
        s = streaks(h, done, as_of=D(2026, 9, 30), today=D(2026, 10, 15))
        assert (s.current, s.max) == (0, 2)

    def test_archived_has_no_current_streak(self):
        h = habit(start=D(2026, 10, 1), archived_at=D(2026, 10, 5))
        done = done_on(1, *days_between(D(2026, 10, 1), D(2026, 10, 4)))
        s = streaks(h, done, as_of=D(2026, 10, 15))
        assert (s.current, s.max) == (0, 4)

    def test_logs_on_non_applicable_days_are_ignored(self):
        h = habit(weekdays=frozenset({0}), start=D(2026, 10, 1))  # solo lunes
        done = done_on(1, D(2026, 10, 6))  # martes: no debería contar
        assert streaks(h, done, as_of=D(2026, 10, 7)).max == 0


# ---------------------------------------------------------------- resumen diario


def test_day_summaries_counts_only_applicable_habits():
    habits = [habit(1), habit(2, weekdays=MON_WED_FRI), habit(3, start=D(2026, 10, 10))]
    done = done_on(1, D(2026, 10, 5)) | done_on(2, D(2026, 10, 5))
    result = {s.date: (s.done, s.total) for s in day_summaries(habits, done, D(2026, 10, 5), D(2026, 10, 10))}
    assert result[D(2026, 10, 5)] == (2, 2)  # lunes: hábitos 1 y 2
    assert result[D(2026, 10, 6)] == (0, 1)  # martes: solo el 1
    assert result[D(2026, 10, 10)] == (0, 2)  # sábado: 1 y el 3 (creado ese día)


# ---------------------------------------------------------------- estadística mensual


class TestMonthlyStats:
    TODAY = D(2026, 10, 15)

    def test_month_without_data(self):
        stats = monthly_stats(D(2026, 10, 1), [], set(), {}, self.TODAY)
        assert stats.overall.rate is None
        assert stats.previous.rate is None
        assert stats.overall_delta is None
        assert stats.best_weekday is None and stats.worst_weekday is None
        assert stats.weight.change is None
        assert len(stats.heatmap) == 31

    def test_habit_created_mid_month(self):
        # Creado el 10-oct; hoy 15-oct sin marcar -> cuentan 10..14 = 5 días
        h = habit(start=D(2026, 10, 10))
        done = done_on(1, D(2026, 10, 10), D(2026, 10, 11))
        hs = monthly_stats(D(2026, 10, 1), [h], done, {}, self.TODAY).habits[0]
        assert (hs.ratio.done, hs.ratio.applicable) == (2, 5)
        assert hs.ratio.rate == pytest.approx(0.4)

    def test_non_applicable_days_excluded(self):
        # L-X-V en octubre hasta el 14: 2,5,7,9,12,14 = 6 días aplicables
        h = habit(weekdays=MON_WED_FRI, start=D(2026, 9, 1))
        done = done_on(1, D(2026, 10, 2), D(2026, 10, 5), D(2026, 10, 7))
        hs = monthly_stats(D(2026, 10, 1), [h], done, {}, self.TODAY).habits[0]
        assert (hs.ratio.done, hs.ratio.applicable) == (3, 6)

    def test_today_counts_only_when_done(self):
        h = habit(start=D(2026, 10, 15))
        assert monthly_stats(D(2026, 10, 1), [h], set(), {}, self.TODAY).habits[0].ratio.applicable == 0
        done = done_on(1, self.TODAY)
        assert monthly_stats(D(2026, 10, 1), [h], done, {}, self.TODAY).habits[0].ratio.rate == 1.0

    def test_future_month_has_no_applicable_days(self):
        stats = monthly_stats(D(2026, 11, 1), [habit()], set(), {}, self.TODAY)
        assert stats.overall.applicable == 0
        assert stats.overall.rate is None

    def test_habit_created_after_month_is_excluded(self):
        stats = monthly_stats(D(2026, 9, 1), [habit(start=D(2026, 10, 3))], set(), {}, self.TODAY)
        assert stats.habits == []

    def test_archived_before_month_is_excluded(self):
        h = habit(start=D(2026, 1, 1), archived_at=D(2026, 9, 1))
        assert monthly_stats(D(2026, 10, 1), [h], set(), {}, self.TODAY).habits == []

    def test_overall_and_previous_month_delta(self):
        h = habit(start=D(2026, 9, 1))
        # Septiembre: 15 de 30 hechos (50 %). Octubre (1..14): 14 de 14 (100 %).
        done = done_on(1, *days_between(D(2026, 9, 1), D(2026, 9, 15)))
        done |= done_on(1, *days_between(D(2026, 10, 1), D(2026, 10, 14)))
        stats = monthly_stats(D(2026, 10, 1), [h], done, {}, self.TODAY)
        assert stats.previous.rate == pytest.approx(0.5)
        assert stats.overall.rate == pytest.approx(1.0)
        assert stats.overall_delta == pytest.approx(0.5)

    def test_best_and_worst_weekday(self):
        h = habit(start=D(2026, 10, 1))
        # Hacemos todos los lunes (5 y 12) y ningún martes (6 y 13).
        others = [d for d in days_between(D(2026, 10, 1), D(2026, 10, 14)) if d.weekday() not in (0, 1)]
        done = done_on(1, D(2026, 10, 5), D(2026, 10, 12)) | done_on(1, *others[::2])
        stats = monthly_stats(D(2026, 10, 1), [h], done, {}, self.TODAY)
        assert stats.weekdays[0].rate == 1.0
        assert stats.weekdays[1].rate == 0.0
        assert stats.best_weekday == 0
        assert stats.worst_weekday == 1

    def test_weight_change_in_month(self):
        weights = {D(2026, 9, 30): 80.0, D(2026, 10, 2): 79.5, D(2026, 10, 10): 78.7}
        stats = monthly_stats(D(2026, 10, 1), [], set(), weights, self.TODAY)
        assert stats.weight.start == 79.5
        assert stats.weight.end == 78.7
        assert stats.weight.change == pytest.approx(-0.8)
        assert stats.weight.entries == 2


def test_month_ratio_handles_mid_month_archive():
    h = habit(start=D(2026, 9, 1), archived_at=D(2026, 9, 11))  # aplica del 1 al 10
    done = done_on(1, *days_between(D(2026, 9, 1), D(2026, 9, 5)))
    ratio = month_ratio([h], done, D(2026, 9, 1), D(2026, 9, 30), today=D(2026, 10, 15))
    assert (ratio.done, ratio.applicable) == (5, 10)


# ---------------------------------------------------------------- peso


def test_moving_average_uses_calendar_window():
    weights = {D(2026, 10, 1): 80.0, D(2026, 10, 2): 79.0, D(2026, 10, 9): 77.0}
    points = moving_average_7d(weights)
    assert [p.moving_avg_7d for p in points] == [80.0, 79.5, 77.0]  # el 9 ya no ve el 1 ni el 2


def test_weight_change_empty_range():
    wc = weight_change({D(2026, 1, 1): 70.0}, D(2026, 10, 1), D(2026, 10, 31))
    assert wc.change is None and wc.entries == 0
