// Vista de un día: checklist de hábitos, tareas puntuales y peso del día.
// Ruta /day/:date, y también "/" (sin parámetro = hoy).
import { addDays } from 'date-fns'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { daysApi, habitsApi, tasksApi, weightApi } from '../api'
import { Icon } from '../components/Icon'
import { Button, Card, CardTitle, EmptyState, ErrorBox, IconButton, Spinner, TextInput } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { formatEs, fromISODate, todayISO, toISODate } from '../lib/dates'
import type { DayData } from '../types/api'

export default function DayPage() {
  const params = useParams()
  const navigate = useNavigate()
  const date = params.date ?? todayISO()
  const isToday = date === todayISO()
  const { data, error, loading, reload, setData } = useApi(() => daysApi.get(date), [date])
  const [actionError, setActionError] = useState<string | null>(null)

  const shift = (delta: number) => navigate(`/day/${toISODate(addDays(fromISODate(date), delta))}`)

  /** Ejecuta una acción contra la API y muestra el error si falla. */
  async function run(action: () => Promise<unknown>, rollback?: () => void) {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      rollback?.()
      setActionError((err as Error).message)
    }
  }

  // --- Hábitos: actualización OPTIMISTA ---------------------------------
  // Cambiamos la UI al instante y, si la API falla, deshacemos el cambio.
  // Así marcar un hábito se siente inmediato aunque la red vaya lenta.
  function toggleHabit(habitId: number, done: boolean) {
    const apply = (value: boolean) =>
      setData((d) => {
        const habits = d.habits.map((h) => (h.id === habitId ? { ...h, done: value } : h))
        return { ...d, habits, summary: { ...d.summary, done: habits.filter((h) => h.done).length } }
      })
    apply(done)
    run(() => habitsApi.setLog(habitId, date, done), () => apply(!done))
  }

  if (error && !data) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return <Spinner />

  const { summary } = data
  const pct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0

  return (
    <div className={loading ? 'opacity-70 transition-opacity' : ''}>
      <PageHeaderDay
        title={isToday ? 'Hoy' : formatEs(date, "EEEE d 'de' MMMM")}
        subtitle={isToday ? formatEs(date, "EEEE d 'de' MMMM yyyy") : formatEs(date, 'yyyy')}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        showToday={!isToday}
      />

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* ----------------------------- Hábitos ----------------------------- */}
        <Card className="md:row-span-2">
          <CardTitle aside={<span className="text-sm font-semibold tabular-nums">{summary.done}/{summary.total}</span>}>
            Hábitos
          </CardTitle>
          {summary.total > 0 && (
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          )}
          {!data.can_log && data.habits.length > 0 && (
            <p className="mb-3 text-xs text-slate-500">Día futuro: podrás marcar los hábitos cuando llegue.</p>
          )}
          {data.habits.length === 0 ? (
            <EmptyState>
              No hay hábitos para este día. <Link to="/habits" className="text-indigo-600 underline dark:text-indigo-400">Crea uno</Link>.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {data.habits.map((h) => (
                <li key={h.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                      h.done
                        ? 'border-transparent bg-slate-50 dark:bg-slate-800/60'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    } ${!data.can_log ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={h.done}
                      disabled={!data.can_log}
                      onChange={(e) => toggleHabit(h.id, e.target.checked)}
                    />
                    {/* Checkbox visual con el color del hábito */}
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border-2 text-white transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500"
                      style={{ borderColor: h.color, backgroundColor: h.done ? h.color : 'transparent' }}
                    >
                      {h.done && <Icon name="check" className="size-4" />}
                    </span>
                    <span className="text-xl" aria-hidden="true">{h.icon}</span>
                    <span className={`flex-1 font-medium ${h.done ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}>
                      {h.name}
                    </span>
                    {h.archived && <span className="text-xs text-slate-400">archivado</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <TasksCard data={data} date={date} setData={setData} run={run} />
        <WeightCard data={data} date={date} reload={reload} run={run} />
      </div>
    </div>
  )
}

function PageHeaderDay(props: {
  title: string
  subtitle: string
  onPrev: () => void
  onNext: () => void
  showToday: boolean
}) {
  return (
    <header className="mb-4 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <IconButton icon="left" label="Día anterior" onClick={props.onPrev} />
        <div className="min-w-0 px-1">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{props.title}</h1>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{props.subtitle}</p>
        </div>
        <IconButton icon="right" label="Día siguiente" onClick={props.onNext} />
      </div>
      {props.showToday && (
        <Link to="/" className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
          Hoy
        </Link>
      )}
    </header>
  )
}

type Run = (action: () => Promise<unknown>, rollback?: () => void) => Promise<void>
type SetData = (updater: (prev: DayData) => DayData) => void

// ------------------------------------------------------------------ Tareas
function TasksCard({ data, date, setData, run }: { data: DayData; date: string; setData: SetData; run: Run }) {
  const [title, setTitle] = useState('')

  async function addTask(e: FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    await run(async () => {
      const task = await tasksApi.create({ title: clean, date })
      setData((d) => ({ ...d, tasks: [...d.tasks, task] }))
      setTitle('')
    })
  }

  function toggle(id: number, done: boolean) {
    const apply = (value: boolean) =>
      setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: value } : t)) }))
    apply(done)
    run(() => tasksApi.update(id, { done }), () => apply(!done))
  }

  function remove(id: number) {
    const previous = data.tasks
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
    run(() => tasksApi.remove(id), () => setData((d) => ({ ...d, tasks: previous })))
  }

  const pending = data.tasks.filter((t) => !t.done).length

  return (
    <Card>
      <CardTitle aside={data.tasks.length > 0 && <span className="text-xs text-slate-500">{pending} pendientes</span>}>
        Tareas
      </CardTitle>
      <form onSubmit={addTask} className="mb-3 flex gap-2">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea…"
          maxLength={200}
          aria-label="Título de la nueva tarea"
        />
        <Button type="submit" icon="plus" disabled={!title.trim()} aria-label="Añadir tarea" />
      </form>
      {data.tasks.length === 0 ? (
        <EmptyState>Sin tareas para este día.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.tasks.map((t) => (
            <li key={t.id} className="group flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => toggle(t.id, e.target.checked)}
                className="size-5 shrink-0 cursor-pointer rounded accent-indigo-600"
                aria-label={`Completar "${t.title}"`}
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${t.done ? 'text-slate-400 line-through' : ''}`}>{t.title}</p>
                {t.notes && <p className="truncate text-xs text-slate-500">{t.notes}</p>}
              </div>
              <IconButton
                icon="trash"
                label={`Borrar "${t.title}"`}
                onClick={() => remove(t.id)}
                className="size-8 opacity-60 hover:text-rose-600 group-hover:opacity-100 sm:opacity-0 dark:hover:text-rose-400"
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ------------------------------------------------------------------ Peso
function WeightCard({ data, date, reload, run }: { data: DayData; date: string; reload: () => void; run: Run }) {
  const [value, setValue] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    const kg = parseFloat(value.replace(',', '.')) // admite "75,4"
    if (Number.isNaN(kg)) return
    await run(async () => {
      await weightApi.upsert(date, kg, data.weight?.note)
      setValue('')
      reload()
    })
  }

  if (!data.can_log) return null

  return (
    <Card>
      <CardTitle aside={<Link to="/weight" className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">Ver historial</Link>}>
        Peso
      </CardTitle>
      <form onSubmit={save} className="flex items-center gap-2">
        {data.weight && (
          <p className="mr-auto text-2xl font-bold tabular-nums">
            {data.weight.weight_kg.toFixed(1)} <span className="text-sm font-normal text-slate-500">kg</span>
          </p>
        )}
        <TextInput
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={data.weight ? 'Corregir' : 'Peso en kg'}
          aria-label="Peso en kilogramos"
          className={data.weight ? 'max-w-28' : ''}
        />
        <Button type="submit" variant="secondary" disabled={!value.trim()}>
          Guardar
        </Button>
      </form>
    </Card>
  )
}
