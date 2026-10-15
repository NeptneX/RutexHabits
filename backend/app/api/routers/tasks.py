"""CRUD de tareas puntuales. Aquí sí se permite borrar."""

import datetime as dt

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.models import Task
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tareas"])


def _get_or_404(db: DbSession, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    db: DbSession,
    date: dt.date | None = None,
    start: dt.date | None = None,
    end: dt.date | None = None,
):
    """Filtra por un día concreto (?date=) o por rango (?start=&end=)."""
    stmt = select(Task).order_by(Task.date, Task.id)
    if date:
        stmt = stmt.where(Task.date == date)
    if start:
        stmt = stmt.where(Task.date >= start)
    if end:
        stmt = stmt.where(Task.date <= end)
    return db.scalars(stmt).all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: DbSession):
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: DbSession):
    return _get_or_404(db, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: DbSession):
    task = _get_or_404(db, task_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: DbSession):
    db.delete(_get_or_404(db, task_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
