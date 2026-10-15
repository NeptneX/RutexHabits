"""Utilidades de fechas compartidas por servicios y routers."""

import calendar
import datetime as dt
import re

_MONTH_RE = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


def parse_month(value: str) -> dt.date:
    """'2026-03' -> date(2026, 3, 1). Lanza ValueError si el formato es inválido."""
    match = _MONTH_RE.match(value)
    if not match:
        raise ValueError("El mes debe tener formato YYYY-MM")
    return dt.date(int(match.group(1)), int(match.group(2)), 1)


def month_bounds(first_day: dt.date) -> tuple[dt.date, dt.date]:
    """Primer y último día del mes al que pertenece `first_day`."""
    last = calendar.monthrange(first_day.year, first_day.month)[1]
    return first_day.replace(day=1), first_day.replace(day=last)


def add_months(day: dt.date, months: int) -> dt.date:
    """Suma (o resta) meses ajustando el día si no existe (31-ene + 1 mes = 28/29-feb)."""
    index = day.year * 12 + (day.month - 1) + months
    year, month = divmod(index, 12)
    last = calendar.monthrange(year, month + 1)[1]
    return dt.date(year, month + 1, min(day.day, last))


def daterange(start: dt.date, end: dt.date):
    """Itera desde `start` hasta `end`, ambos incluidos."""
    for offset in range((end - start).days + 1):
        yield start + dt.timedelta(days=offset)
