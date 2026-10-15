"""Genera ~3 meses de datos realistas de hábitos, tareas y peso.

Uso (desde backend/, con la BD ya migrada):
    python -m scripts.seed            # añade datos si la BD está vacía
    python -m scripts.seed --reset    # BORRA todo y vuelve a generar

Los datos son pseudoaleatorios pero reproducibles (semilla fija), con
patrones creíbles: rachas, peor cumplimiento los fines de semana, un hábito
creado a mitad del periodo, otro archivado y un peso que baja poco a poco
con ruido diario.
"""

import argparse
import datetime as dt
import random

from sqlalchemy import delete, func, select

from app.core.dates import add_months, daterange
from app.db.session import SessionLocal
from app.models import Habit, HabitLog, Task, WeightEntry

SEED = 42
WEEKDAYS = list(range(7))

# (nombre, color, icono, días, prob. base de cumplir, meses de antigüedad, archivado hace N días)
HABITS = [
    ("Estudiar", "#6366f1", "📚", [0, 1, 2, 3, 4], 0.80, 3, None),
    ("Gimnasio", "#ef4444", "🏋️", [0, 2, 4], 0.70, 3, None),
    ("Comer bien", "#22c55e", "🥗", WEEKDAYS, 0.65, 3, None),
    ("Leer 20 min", "#f59e0b", "📖", WEEKDAYS, 0.55, 3, None),
    ("Dormir 8 h", "#0ea5e9", "😴", WEEKDAYS, 0.60, 1, None),  # creado hace ~1 mes
    ("Meditar", "#a855f7", "🧘", [0, 1, 2, 3, 4], 0.35, 3, 20),  # abandonado (archivado)
]

TASKS = [
    "Entregar práctica de Estructuras de Datos",
    "Repasar tema 3 de Bases de Datos",
    "Llamar a casa",
    "Comprar comida",
    "Lavadora",
    "Reunión del grupo de prácticas",
    "Pagar el abono de transporte",
    "Ejercicios de Cálculo",
    "Preparar examen de Redes",
    "Ir a tutoría",
]


def seed(reset: bool) -> None:
    rng = random.Random(SEED)
    today = dt.date.today()
    db = SessionLocal()
    try:
        if reset:
            # Orden importante: primero las tablas hijas (FK).
            for model in (HabitLog, Habit, Task, WeightEntry):
                db.execute(delete(model))
            db.commit()
        elif db.scalar(select(func.count()).select_from(Habit)):
            print("La BD ya tiene datos. Usa --reset para regenerarlos.")
            return

        # ---------------- hábitos y registros ----------------
        n_logs = 0
        for name, color, icon, weekdays, prob, months_ago, archived_days_ago in HABITS:
            start = add_months(today, -months_ago)
            archived_at = today - dt.timedelta(days=archived_days_ago) if archived_days_ago else None
            habit = Habit(
                name=name,
                color=color,
                icon=icon,
                weekdays=weekdays,
                created_at=dt.datetime.combine(start, dt.time(9, 0)),
                archived_at=archived_at,
            )
            db.add(habit)
            db.flush()  # asigna habit.id sin cerrar la transacción

            last_day = (archived_at - dt.timedelta(days=1)) if archived_at else today - dt.timedelta(days=1)
            motivation = 0.0  # simula "rachas": cumplir hoy anima a cumplir mañana
            for day in daterange(start, last_day):
                if day.weekday() not in weekdays:
                    continue
                p = prob + motivation
                if day.weekday() >= 5:
                    p -= 0.15  # el finde cuesta más
                done = rng.random() < max(0.05, min(0.97, p))
                motivation = min(0.15, motivation + 0.03) if done else max(-0.1, motivation - 0.08)
                db.add(HabitLog(habit_id=habit.id, date=day, done=done))
                n_logs += 1

        # ---------------- tareas ----------------
        n_tasks = 0
        for day in daterange(add_months(today, -3), today + dt.timedelta(days=14)):
            for _ in range(rng.choice([0, 0, 1, 1, 2])):
                db.add(
                    Task(
                        title=rng.choice(TASKS),
                        date=day,
                        done=day < today and rng.random() < 0.85,
                        notes=None,
                    )
                )
                n_tasks += 1

        # ---------------- peso ----------------
        # Tendencia: de ~78.5 kg a ~76 kg en 3 meses, con ruido diario (agua,
        # comidas...) y algún día sin pesarse.
        weight_start = add_months(today, -3)
        total_days = (today - weight_start).days
        n_weights = 0
        for i, day in enumerate(daterange(weight_start, today)):
            if rng.random() < 0.2:
                continue  # ~20 % de días sin pesarse
            trend = 78.5 - 2.5 * (i / total_days)
            weight = round(trend + rng.gauss(0, 0.35), 1)
            db.add(WeightEntry(date=day, weight_kg=weight))
            n_weights += 1

        db.commit()
        print(f"Seed OK: {len(HABITS)} hábitos, {n_logs} registros, {n_tasks} tareas, {n_weights} pesos.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="borra todos los datos antes de generar")
    seed(parser.parse_args().reset)
