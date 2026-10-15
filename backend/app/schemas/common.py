"""Piezas comunes a varios schemas."""

from typing import ClassVar

from pydantic import BaseModel, ConfigDict, model_validator


class ORMModel(BaseModel):
    """Base para respuestas: permite construir el schema desde un objeto SQLAlchemy."""

    model_config = ConfigDict(from_attributes=True)


class PatchModel(BaseModel):
    """Base para PATCH: todos los campos son opcionales, pero si se envían
    explícitamente no pueden ser null (salvo los listados en NULLABLE)."""

    # ClassVar: es un atributo de clase, NO un campo del JSON.
    NULLABLE: ClassVar[frozenset[str]] = frozenset()
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def _no_explicit_nulls(self):
        for name in self.model_fields_set:
            if getattr(self, name) is None and name not in self.NULLABLE:
                raise ValueError(f"El campo '{name}' no puede ser null")
        return self
