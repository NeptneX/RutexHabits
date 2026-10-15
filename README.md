# 📅 Habit Tracker

Aplicación web de uso personal para seguir **hábitos**, **tareas del día** y **peso corporal**, con calendario mensual y estadísticas.

- **Backend:** Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · SQLite · Pydantic · pytest
- **Frontend:** React · Vite · TypeScript · React Router · Recharts · date-fns · Tailwind CSS

---

## ✨ Funcionalidades

| Sección | Qué hace |
|---|---|
| **Hoy / Día** | Checklist de los hábitos que tocan ese día, tareas puntuales (crear, completar, borrar) y peso del día. Navegación día a día. |
| **Calendario** | Vista mensual: cada día muestra `hechos/total` coloreado según el %. Clic en un día → vista del día. |
| **Hábitos** | Crear, editar y **archivar** (nunca se borran, para no perder estadísticas). Nombre, color, emoji y días de la semana. |
| **Peso** | Un registro por día, historial, gráfica con peso diario + media móvil de 7 días y rango de 1, 3, 6 o 12 meses. |
| **Estadísticas** | % por hábito, rachas actual y máxima, cumplimiento global vs. mes anterior, mejor y peor día de la semana, variación de peso, heatmap y barras. |

Interfaz responsive (barra de navegación inferior en el móvil) con modo claro, oscuro o del sistema.

---

## 🚀 Puesta en marcha

Requisitos: **Python 3.12+** y **Node.js 20+**.

### 1. Backend (terminal 1)

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"            # dependencias + herramientas de desarrollo

alembic upgrade head               # crea habits.db con el esquema
python -m scripts.seed             # (opcional) ~3 meses de datos de ejemplo
uvicorn app.main:app --reload      # http://127.0.0.1:8000
```

- Documentación interactiva de la API: **http://127.0.0.1:8000/docs**
- Para regenerar los datos de ejemplo desde cero: `python -m scripts.seed --reset`

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Vite reenvía las peticiones a `/api` al backend (proxy configurado en `vite.config.ts`).

### 📱 Probarlo en el móvil

Con el móvil en la misma red Wi-Fi que el ordenador:

```bash
npm run dev -- --host              # Vite muestra una URL tipo http://192.168.1.X:5173
```

Abre esa URL en el móvil. No hace falta exponer el backend: el proxy de Vite le reenvía las peticiones desde el ordenador.

---

## 🧪 Tests y calidad

```bash
cd backend && pytest               # 48 tests: estadísticas (unitarios) + API (integración)
cd frontend && npm run lint        # oxlint
cd frontend && npm run build       # comprobación de tipos (tsc) + build de producción
```

- `tests/test_stats.py` prueba las funciones puras de estadísticas **sin base de datos**. Cubre hábitos creados a mitad de mes, días que no aplican, rachas que cruzan meses, un mes sin datos, archivados y el día de hoy pendiente.
- `tests/test_api_*.py` prueban los endpoints con `TestClient`, una BD SQLite **en memoria** nueva en cada test y una fecha "de hoy" fija.

---

## 🔍 Recorrido rápido por `/docs`

1. `GET /api/habits`: lista los hábitos (si ejecutaste el seed, verás 5 activos).
2. `POST /api/habits` con:
   ```json
   { "name": "Beber agua", "color": "#0ea5e9", "icon": "💧", "weekdays": [0,1,2,3,4,5,6] }
   ```
   Devuelve `201`. Prueba también `"color": "rojo"` o `"weekdays": [9]` para ver un `422`.
3. `PUT /api/habits/{id}/logs/{fecha}` con `{"done": true}` usando la fecha de hoy. Repítelo: es idempotente. Con una fecha futura obtendrás un `422`.
4. `GET /api/days/{fecha}`: todo lo de un día (hábitos con su estado, tareas y peso).
5. `GET /api/calendar?month=YYYY-MM`: el resumen del calendario.
6. `GET /api/stats/monthly?month=YYYY-MM`: todas las estadísticas del mes.
7. `PUT /api/weight/{fecha}` con `{"weight_kg": 75.4}`: la primera vez devuelve `201` y después `200` (crear o actualizar).
8. `DELETE /api/habits/{id}` devuelve `405`: los hábitos no se borran, se archivan con `PATCH {"archived": true}`.

---

## 🗂️ Estructura

```
backend/
├── alembic/versions/      # migraciones de la BD (historial de cambios del esquema)
├── app/
│   ├── main.py            # crea la app FastAPI: CORS + routers bajo /api
│   ├── core/              # configuración (pydantic-settings) y utilidades de fechas
│   ├── db/                # Base declarativa, engine y sesión
│   ├── models/            # tablas SQLAlchemy
│   ├── schemas/           # modelos Pydantic: validan entradas y dan forma a las salidas
│   ├── api/deps.py        # dependencias inyectables: get_db, get_today, ?month=
│   ├── api/routers/       # endpoints por recurso
│   └── services/
│       ├── stats.py       # ⭐ lógica de estadísticas: funciones PURAS
│       └── habits.py      # consultas a la BD -> estructuras para stats.py
├── scripts/seed.py
└── tests/

frontend/src/
├── api/                   # cliente fetch + una función por endpoint
├── types/api.ts           # tipos TS que reflejan los schemas del backend
├── hooks/                 # useApi (carga de datos), useTheme (modo oscuro)
├── lib/                   # fechas, escala de colores, tema de gráficas
├── components/            # Layout, UI reutilizable, iconos, KPIs
└── pages/                 # Day, Calendar, Habits, Weight, Stats
```

### Cómo fluye una petición

```
Componente React ─▶ api/index.ts ─▶ fetch /api/... ─▶ (proxy Vite) ─▶ router FastAPI
                                                                       │ valida con schemas/
                                                                       │ lee con models/ + services/habits.py
                                                                       │ calcula con services/stats.py
                                                                       ▼
                                                              respuesta JSON (schema)
```

---

## 🌐 API REST (`/api`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Comprobación de vida |
| GET | `/habits?include_archived=false` | Lista de hábitos |
| POST | `/habits` | Crear (`201`). `start_date` opcional para empezar en una fecha pasada |
| GET / PATCH | `/habits/{id}` | Detalle / edición parcial (incluye `{"archived": true\|false}`) |
| GET | `/habits/{id}/logs?start=&end=` | Registros de un hábito |
| PUT | `/habits/{id}/logs/{date}` | Marcar o desmarcar (`{"done": bool}`), idempotente |
| GET | `/days/{date}` | Todo lo de un día |
| GET | `/calendar?month=YYYY-MM` | `hechos/total` de cada día del mes |
| GET / POST | `/tasks?date=` | Listar / crear tareas |
| GET / PATCH / DELETE | `/tasks/{id}` | Detalle / editar / borrar (`204`) |
| GET | `/weight?months=1\|3\|6\|12` | Serie de peso con media móvil de 7 días |
| GET / PUT / DELETE | `/weight/{date}` | Leer / crear-o-actualizar (`201`/`200`) / borrar |
| GET | `/stats/monthly?month=YYYY-MM` | Estadísticas completas del mes |

---

## 🧠 Decisiones de diseño

- **`archived_at` en lugar de un booleano.** Guardar *desde cuándo* está archivado un hábito permite que las estadísticas de meses pasados no cambien al archivarlo. La API sigue exponiendo `archived: bool`.
- **Reglas de cumplimiento** (en `services/stats.py`):
  - Un hábito aplica un día si coincide el día de la semana, el día es posterior a su creación y anterior a su archivado.
  - Los días futuros nunca cuentan. **Hoy solo cuenta si ya lo has cumplido**, para que el % no baje por la mañana.
  - Rachas: los días que no aplican se saltan (no rompen la racha), y hoy sin marcar tampoco la rompe.
- **Estadísticas como funciones puras.** `stats.py` no importa nada de FastAPI ni de SQLAlchemy, así que se testea con datos hechos a mano, sin servidor ni BD.
- **`PUT` para registros y peso.** Con un identificador natural (hábito + fecha, o fecha) y como mucho uno por día, `PUT` es idempotente: repetir la petición deja el mismo estado. Encaja con un checkbox.
- **Fecha "de hoy" inyectada** (`Depends(get_today)`): los tests la fijan y no dependen del día real.
- **Media móvil por días de calendario** (el día y los 6 anteriores), no por "últimos 7 registros": si un día no te pesas, no se mezclan semanas distintas.
- **Actualizaciones optimistas en el frontend:** al marcar un hábito la interfaz cambia al instante y, si la API falla, se deshace el cambio.
- **Estado en la URL:** el mes del calendario y el de las estadísticas están en `?month=`, así que recargar o compartir el enlace mantiene la vista.

### 🔐 Preparado para autenticación

Hoy no hay usuarios, pero añadirlos sería localizado:

1. Crear el modelo `User` y una migración que añada `user_id` a `habits`, `tasks` y `weight_entries`.
2. Crear `get_current_user` en `app/api/deps.py` (por ejemplo, leyendo un JWT de la cabecera `Authorization`).
3. Añadir `dependencies=[Depends(get_current_user)]` al router `/api` en `main.py` y filtrar las consultas por usuario.
4. En el frontend, añadir la cabecera `Authorization` en `api/client.ts`, que es el único sitio que hace `fetch`.

---

## 🛠️ Cambiar el esquema de la BD (Alembic)

```bash
# 1. Modifica un modelo en app/models/
# 2. Genera la migración comparando modelos con la BD:
alembic revision --autogenerate -m "descripción del cambio"
# 3. Revisa el archivo generado en alembic/versions/ y aplícalo:
alembic upgrade head
# Deshacer la última migración:
alembic downgrade -1
```

## ❓ Problemas frecuentes

- **"No se pudo conectar con el servidor"** en el frontend: el backend no está arrancado en el puerto 8000.
- **`no such table`**: falta ejecutar `alembic upgrade head` desde `backend/`.
- **La BD está en un sitio raro:** la ruta de `DATABASE_URL` (`sqlite:///./habits.db`) es relativa al directorio desde el que lanzas los comandos. Lánzalos siempre desde `backend/`, o cámbiala en `backend/.env` (ver `.env.example`).
