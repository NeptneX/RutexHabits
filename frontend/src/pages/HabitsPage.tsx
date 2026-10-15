// Gestión de hábitos: crear, editar y archivar/desarchivar.
// No hay "borrar": archivar conserva el historial para las estadísticas.
import { useState, type FormEvent, type ReactNode } from 'react'
import { habitsApi } from '../api'
import { Button, Card, CardTitle, EmptyState, ErrorBox, IconButton, Label, PageHeader, Spinner, TextInput } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { formatEs, todayISO, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../lib/dates'
import { describeWeekdays, WEEKDAY_PRESETS } from '../lib/habits'
import type { Habit, HabitInput } from '../types/api'

const COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7']
const EMOJIS = ['📚', '🏋️', '🏃', '🥗', '💧', '📖', '😴', '🧘', '💻', '🎸', '🧹', '💊', '🚭', '✍️', '🌱', '✅']
export default function HabitsPage() {
  const { data: habits, error, reload, setData } = useApi(() => habitsApi.list(true), [])
  // null = formulario cerrado; 'new' = creando; Habit = editando ese hábito
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function setArchived(habit: Habit, archived: boolean) {
    setActionError(null)
    try {
      const updated = await habitsApi.update(habit.id, { archived })
      setData((list) => list.map((h) => (h.id === updated.id ? updated : h)))
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  function onSaved(saved: Habit) {
    setData((list) => (list.some((h) => h.id === saved.id) ? list.map((h) => (h.id === saved.id ? saved : h)) : [...list, saved]))
    setEditing(null)
  }

  if (error && !habits) return <ErrorBox message={error} onRetry={reload} />
  if (!habits) return <Spinner />

  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hábitos"
        subtitle={`${active.length} activos`}
        actions={
          editing === null && (
            <Button icon="plus" onClick={() => setEditing('new')}>
              Nuevo
            </Button>
          )
        }
      />

      {actionError && <ErrorBox message={actionError} />}

      {editing !== null && (
        <HabitForm
          // key: al cambiar de hábito, React crea un formulario nuevo con su estado inicial
          key={editing === 'new' ? 'new' : editing.id}
          habit={editing === 'new' ? undefined : editing}
          onSaved={onSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <Card>
        <CardTitle>Activos</CardTitle>
        {active.length === 0 ? (
          <EmptyState>Aún no tienes hábitos. ¡Crea el primero!</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {active.map((h) => (
              <HabitRow key={h.id} habit={h}>
                <IconButton icon="edit" label={`Editar ${h.name}`} onClick={() => setEditing(h)} />
                <IconButton icon="archive" label={`Archivar ${h.name}`} onClick={() => setArchived(h, true)} />
              </HabitRow>
            ))}
          </ul>
        )}
      </Card>

      {archived.length > 0 && (
        <Card>
          <CardTitle>Archivados</CardTitle>
          <p className="mb-2 text-xs text-slate-500">
            Ya no aparecen en el día a día, pero su historial sigue contando en las estadísticas.
          </p>
          <ul className="divide-y divide-slate-100 opacity-75 dark:divide-slate-800">
            {archived.map((h) => (
              <HabitRow key={h.id} habit={h}>
                <Button variant="ghost" icon="undo" onClick={() => setArchived(h, false)}>
                  Restaurar
                </Button>
              </HabitRow>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function HabitRow({ habit, children }: { habit: Habit; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: `${habit.color}22`, boxShadow: `inset 0 0 0 2px ${habit.color}` }}
        aria-hidden="true"
      >
        {habit.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{habit.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {describeWeekdays(habit.weekdays)} · desde {formatEs(habit.created_at.slice(0, 10), 'd MMM yyyy')}
          {habit.archived_at && ` · archivado el ${formatEs(habit.archived_at, 'd MMM yyyy')}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </li>
  )
}

// ------------------------------------------------------------------ Formulario
function HabitForm({ habit, onSaved, onCancel }: { habit?: Habit; onSaved: (h: Habit) => void; onCancel: () => void }) {
  const [form, setForm] = useState<HabitInput>({
    name: habit?.name ?? '',
    color: habit?.color ?? COLORS[0],
    icon: habit?.icon ?? EMOJIS[0],
    weekdays: habit?.weekdays ?? [0, 1, 2, 3, 4, 5, 6],
    start_date: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof HabitInput>(key: K, value: HabitInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  const toggleDay = (day: number) =>
    update('weekdays', form.weekdays.includes(day) ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day].sort())

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { start_date, ...fields } = form
      const saved = habit
        ? await habitsApi.update(habit.id, fields)
        : await habitsApi.create({ ...fields, start_date: start_date || null })
      onSaved(saved)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-900">
      <form onSubmit={submit} className="space-y-4">
        <CardTitle aside={<IconButton icon="x" label="Cerrar" onClick={onCancel} />}>
          {habit ? 'Editar hábito' : 'Nuevo hábito'}
        </CardTitle>

        <div className="flex gap-3">
          <div className="w-20 shrink-0">
            <Label htmlFor="habit-icon">Icono</Label>
            <TextInput
              id="habit-icon"
              value={form.icon}
              onChange={(e) => update('icon', e.target.value)}
              maxLength={16}
              required
              className="text-center text-xl"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="habit-name">Nombre</Label>
            <TextInput
              id="habit-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Ej. Estudiar 2 horas"
              maxLength={80}
              required
              autoFocus
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Sugerencias de icono">
          {EMOJIS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => update('icon', emoji)}
              className={`size-9 rounded-lg text-lg transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                form.icon === emoji ? 'bg-slate-100 ring-2 ring-indigo-500 dark:bg-slate-800' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => update('color', c)}
                aria-label={`Color ${c}`}
                aria-pressed={form.color === c}
                className={`size-8 rounded-full transition ${form.color === c ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-slate-900' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={(e) => update('color', e.target.value)}
              aria-label="Color personalizado"
              className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </div>
        </div>

        <div>
          <Label>Días de la semana</Label>
          <div className="flex gap-1.5">
            {WEEKDAY_SHORT.map((label, day) => {
              const on = form.weekdays.includes(day)
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  aria-pressed={on}
                  aria-label={WEEKDAY_NAMES[day]}
                  className={`size-10 rounded-xl text-sm font-semibold transition ${
                    on ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                  style={on ? { backgroundColor: form.color } : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex gap-2">
            {WEEKDAY_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={() => update('weekdays', p.days)}
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {!habit && (
          <div className="max-w-xs">
            <Label htmlFor="habit-start">Empieza a contar desde (opcional)</Label>
            <TextInput
              id="habit-start"
              type="date"
              max={todayISO()}
              value={form.start_date ?? ''}
              onChange={(e) => update('start_date', e.target.value || null)}
            />
            <p className="mt-1 text-xs text-slate-500">Útil si quieres registrar días pasados. Por defecto, hoy.</p>
          </div>
        )}

        {habit && (
          <p className="text-xs text-slate-500">
            Nota: cambiar los días también cambia cómo se calculan las estadísticas pasadas de este hábito.
          </p>
        )}

        {error && <ErrorBox message={error} />}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !form.name.trim() || form.weekdays.length === 0}>
            {saving ? 'Guardando…' : habit ? 'Guardar cambios' : 'Crear hábito'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
