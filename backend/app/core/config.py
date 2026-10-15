"""Configuración de la aplicación.

Usamos pydantic-settings: cada atributo se puede sobreescribir con una variable
de entorno del mismo nombre (o en un archivo .env). Así el código no tiene
valores "a fuego" y en tests o producción basta con cambiar el entorno.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Ruta relativa al directorio desde el que se arranca (backend/).
    database_url: str = "sqlite:///./habits.db"

    # Orígenes a los que permitimos llamar a la API desde el navegador (Vite).
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    """Devuelve una única instancia (se lee el entorno una sola vez)."""
    return Settings()
