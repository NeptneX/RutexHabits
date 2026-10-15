// Peso corporal: registro, gráfica (peso diario + media móvil de 7 días)
// con selector de rango, e historial editable.
import { useState, type FormEvent } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { weightApi } from '../api'
import { Delta, StatTile } from '../components/StatTile'
import { Button, Card, CardTitle, EmptyState, ErrorBox, IconButton, Label, PageHeader, Spinner, TextInput } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { useChartTheme } from '../lib/chartTheme'
import { formatEs, todayISO } from '../lib/dates'
import type { WeightPoint } from '../types/api'

const RANGES = [1, 3, 6, 12] as const

export default function WeightPage() {
  const [months, setMonths] = useState<number>(3)
  const { data, error, loading, reload } = useApi(() => weightApi.series(months), [months])
  const [actionError, setActionError] = useState<string | null>(null)

  async function remove(date: string) {
    if (!confirm(`¿Borrar el peso del ${formatEs(date, 'd MMM yyyy')}?`)) return
    try {
      await weightApi.remove(date)
      reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const entries = data?.entries ?? []
  const last = entries.at(-1)
  const first = entries[0]
  // Comparamos medias móviles (no pesos sueltos) para que el ruido diario no engañe.
  const trend = first && last && entries.length > 1 ? last.moving_avg_7d - first.moving_avg_7d : null

  return (
    <div className="space-y-4">
      <PageHeader title="Peso" subtitle="Registro diario y tendencia" />

      <WeightForm onSaved={reload} />

      {(error || actionError) && <ErrorBox message={(error ?? actionError)!} onRetry={error ? reload : undefined} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Último registro"
          value={last ? `${last.weight_kg.toFixed(1)} kg` : '—'}
          detail={last && formatEs(last.date, "d 'de' MMMM")}
        />
        <StatTile label="Media 7 días" value={last ? `${last.moving_avg_7d.toFixed(1)} kg` : '—'} detail="Tendencia suavizada" />
        <div className="col-span-2 sm:col-span-1">
          <StatTile
            label={`Cambio en ${months === 12 ? '1 año' : `${months} ${months === 1 ? 'mes' : 'meses'}`}`}
            value={<Delta value={trend} suffix=" kg" goodWhen="neutral" />}
            detail="Entre medias de 7 días"
          />
        </div>
      </div>

      <Card>
        <CardTitle
          aside={
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label="Rango">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setMonths(r)}
                  aria-pressed={months === r}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    months === r
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {r === 12 ? '1 año' : `${r} m`}
                </button>
              ))}
            </div>
          }
        >
          Evolución
        </CardTitle>
        {!data && loading ? (
          <Spinner />
        ) : entries.length === 0 ? (
          <EmptyState>No hay registros en este rango.</EmptyState>
        ) : (
          <WeightChart entries={entries} />
        )}
      </Card>

      <Card>
        <CardTitle>Historial</CardTitle>
        {entries.length === 0 ? (
          <EmptyState>Sin registros.</EmptyState>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 text-right font-medium">Peso</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">Media 7 d</th>
                  <th className="hidden py-2 pl-4 font-medium sm:table-cell">Nota</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...entries].reverse().map((e) => (
                  <tr key={e.date}>
                    <td className="py-2">{formatEs(e.date, 'EEE d MMM yyyy')}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{e.weight_kg.toFixed(1)} kg</td>
                    <td className="hidden py-2 text-right text-slate-500 tabular-nums sm:table-cell">{e.moving_avg_7d.toFixed(1)}</td>
                    <td className="hidden max-w-48 truncate py-2 pl-4 text-slate-500 sm:table-cell">{e.note}</td>
                    <td className="py-1 text-right">
                      <IconButton icon="trash" label={`Borrar ${e.date}`} onClick={() => remove(e.date)} className="size-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ------------------------------------------------------------------ Formulario
function WeightForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const kg = parseFloat(weight.replace(',', '.'))
    if (Number.isNaN(kg)) return setError('Introduce un número válido')
    setSaving(true)
    setError(null)
    try {
      // PUT = crear o sobrescribir: si ya había peso ese día, se actualiza.
      await weightApi.upsert(date, kg, note.trim() || null)
      setWeight('')
      setNote('')
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_8rem_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="w-date">Fecha</Label>
          <TextInput id="w-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="w-kg">Peso (kg)</Label>
          <TextInput id="w-kg" inputMode="decimal" placeholder="75,4" value={weight} onChange={(e) => setWeight(e.target.value)} required />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="w-note">Nota (opcional)</Label>
          <TextInput id="w-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Ej. después de entrenar" />
        </div>
        <Button type="submit" disabled={saving || !weight.trim()} className="col-span-2 sm:col-span-1">
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
      {error && <div className="mt-3"><ErrorBox message={error} /></div>}
    </Card>
  )
}

// ------------------------------------------------------------------ Gráfica
function WeightChart({ entries }: { entries: WeightPoint[] }) {
  const theme = useChartTheme()

  return (
    <div>
      {/* Leyenda propia: identifica las dos series sin depender solo del color */}
      <div className="mb-2 flex gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: theme.muted }} />
          Peso diario
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: theme.series }} />
          Media móvil 7 días
        </span>
      </div>
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={entries} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatEs(d, 'd MMM')}
              tick={{ fill: theme.axis, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              minTickGap={24}
            />
            <YAxis
              domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
              tick={{ fill: theme.axis, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as WeightPoint | undefined
                if (!active || !p) return null
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <p className="mb-1 font-semibold">{formatEs(p.date, "EEE d 'de' MMMM")}</p>
                    <p>Peso: <b className="tabular-nums">{p.weight_kg.toFixed(1)} kg</b></p>
                    <p>Media 7 d: <b className="tabular-nums">{p.moving_avg_7d.toFixed(2)} kg</b></p>
                    {p.note && <p className="mt-1 text-slate-500">{p.note}</p>}
                  </div>
                )
              }}
            />
            {/* Peso diario: solo puntos (el ruido día a día no merece una línea) */}
            <Line
              dataKey="weight_kg"
              stroke="none"
              dot={{ r: entries.length > 120 ? 2 : 3, fill: theme.muted, stroke: theme.surface, strokeWidth: 1 }}
              activeDot={{ r: 5, fill: theme.muted, stroke: theme.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {/* Tendencia: línea de 2 px */}
            <Line
              dataKey="moving_avg_7d"
              stroke={theme.series}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: theme.series, stroke: theme.surface, strokeWidth: 2 }}
              type="monotone"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
