// Estadísticas mensuales. Todo se calcula en el backend (GET /api/stats/monthly);
// aquí solo se presenta: KPIs, heatmap, barras por hábito y por día, y rachas.
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { statsApi } from '../api'
import { Icon } from '../components/Icon'
import { Delta, StatTile } from '../components/StatTile'
import { Card, CardTitle, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { heatLevel, useChartTheme, type ChartTheme } from '../lib/chartTheme'
import { formatEs, fromISODate, mondayIndex, parseMonthKey, shiftMonth, todayISO, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../lib/dates'
import { formatPercent } from '../lib/progress'
import type { DaySummary, HabitStats, MonthlyStats, WeekdayStats } from '../types/api'

export default function StatsPage() {
  const [params, setParams] = useSearchParams()
  const currentMonth = todayISO().slice(0, 7)
  const month = parseMonthKey(params.get('month')) ? params.get('month')! : currentMonth
  const { data, error, loading, reload } = useApi(() => statsApi.monthly(month), [month])
  const theme = useChartTheme()

  return (
    <div className="space-y-4">
      <PageHeader
        title={formatEs(parseMonthKey(month)!, 'LLLL yyyy')}
        subtitle="Estadísticas del mes"
        onPrev={() => setParams({ month: shiftMonth(month, -1) })}
        onNext={() => setParams({ month: shiftMonth(month, 1) })}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
      />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <Spinner />}
      {data && (
        <div className={`space-y-4 ${loading ? 'opacity-70' : ''}`}>
          <Kpis data={data} />
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <Card>
              <CardTitle>Mapa del mes</CardTitle>
              <Heatmap days={data.heatmap} theme={theme} />
            </Card>
            <Card>
              <CardTitle>Por día de la semana</CardTitle>
              <WeekdayChart weekdays={data.weekdays} theme={theme} best={data.best_weekday} worst={data.worst_weekday} />
            </Card>
          </div>
          <Card>
            <CardTitle>Cumplimiento por hábito</CardTitle>
            {data.habits.length === 0 ? (
              <EmptyState>No había hábitos activos este mes.</EmptyState>
            ) : (
              <>
                <HabitBars habits={data.habits} theme={theme} />
                <HabitTable habits={data.habits} />
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ KPIs
function Kpis({ data }: { data: MonthlyStats }) {
  const { overall, previous, weight } = data
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Cumplimiento global"
        value={formatPercent(overall.rate)}
        detail={`${overall.done} de ${overall.applicable} hábitos`}
      />
      <StatTile
        label="Vs. mes anterior"
        value={<Delta value={data.overall_delta == null ? null : data.overall_delta * 100} suffix=" pp" digits={0} />}
        detail={`${formatEs(previous.month + '-01', 'LLLL')}: ${formatPercent(previous.rate)}`}
      />
      <StatTile
        label="Mejor / peor día"
        value={
          <span className="text-xl sm:text-2xl">
            {data.best_weekday != null ? WEEKDAY_NAMES[data.best_weekday].slice(0, 3) : '—'}
            <span className="text-slate-400"> / </span>
            {data.worst_weekday != null ? WEEKDAY_NAMES[data.worst_weekday].slice(0, 3) : '—'}
          </span>
        }
        detail={
          data.best_weekday != null && data.worst_weekday != null
            ? `${formatPercent(data.weekdays[data.best_weekday].rate)} vs ${formatPercent(data.weekdays[data.worst_weekday].rate)}`
            : 'Sin datos'
        }
      />
      <StatTile
        label="Variación de peso"
        value={weight.change == null ? '—' : <Delta value={weight.change} suffix=" kg" goodWhen="neutral" />}
        detail={weight.start != null ? `${weight.start.toFixed(1)} → ${weight.end!.toFixed(1)} kg (${weight.entries} registros)` : 'Sin registros'}
      />
    </div>
  )
}

// ------------------------------------------------------------------ Heatmap
// Estilo GitHub: columnas = semanas, filas = días (L..D). Un solo tono, de
// claro (poco) a oscuro (mucho). Pasando el ratón (o tocando) se ve el detalle.
function Heatmap({ days, theme }: { days: DaySummary[]; theme: ChartTheme }) {
  const [hover, setHover] = useState<DaySummary | null>(null)
  const today = todayISO()
  const offset = mondayIndex(fromISODate(days[0].date))
  const cells: (DaySummary | null)[] = [...Array(offset).fill(null), ...days]
  const weeks = Math.ceil(cells.length / 7)

  return (
    <div>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-1 text-[10px] text-slate-500">
          {WEEKDAY_SHORT.map((d) => (
            <span key={d} className="flex size-7 items-center sm:size-8">{d}</span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, auto)` }}>
          {cells.map((day, i) => {
            if (!day) return <span key={`e${i}`} className="size-7 sm:size-8" />
            const future = day.date > today
            const level = future ? null : heatLevel(day.done, day.total)
            return (
              <button
                key={day.date}
                type="button"
                onMouseEnter={() => setHover(day)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(day)}
                onBlur={() => setHover(null)}
                aria-label={`${formatEs(day.date, "d 'de' MMMM")}: ${day.done} de ${day.total}`}
                className="size-7 rounded-md transition hover:ring-2 hover:ring-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none sm:size-8"
                style={{
                  backgroundColor: level == null ? 'transparent' : theme.heat[level],
                  boxShadow: level == null ? `inset 0 0 0 1px ${theme.grid}` : undefined,
                }}
              />
            )
          })}
        </div>
      </div>
      <p className="mt-3 h-4 text-xs text-slate-600 dark:text-slate-300" aria-live="polite">
        {hover
          ? `${formatEs(hover.date, "EEEE d")}: ${hover.total ? `${hover.done}/${hover.total} (${formatPercent(hover.done / hover.total)})` : 'sin hábitos'}`
          : ' '}
      </p>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
        Menos
        {theme.heat.map((c) => (
          <span key={c} className="inline-block size-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        Más
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Barras
const percentAxis = {
  domain: [0, 100] as [number, number],
  ticks: [0, 25, 50, 75, 100],
  tickFormatter: (v: number) => `${v}%`,
}

function ChartTooltip({ title, ratio }: { title: string; ratio: { done: number; applicable: number; rate: number | null } }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="font-semibold">{title}</p>
      <p>
        {formatPercent(ratio.rate)} · {ratio.done}/{ratio.applicable} días
      </p>
    </div>
  )
}

function HabitBars({ habits, theme }: { habits: HabitStats[]; theme: ChartTheme }) {
  const rows = habits.map((h) => ({ ...h, label: `${h.icon} ${h.name}`, pct: h.rate == null ? 0 : Math.round(h.rate * 100) }))
  return (
    <div style={{ height: rows.length * 44 + 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid stroke={theme.grid} horizontal={false} />
          <XAxis type="number" {...percentAxis} tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fill: theme.text, fontSize: 13 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: theme.grid, opacity: 0.4 }}
            content={({ active, payload }) => {
              const h = payload?.[0]?.payload as (HabitStats & { label: string }) | undefined
              return active && h ? <ChartTooltip title={h.label} ratio={h} /> : null
            }}
          />
          {/* Cada barra con el color de SU hábito (identidad), el nombre en el eje evita depender del color */}
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((h) => (
              <Cell key={h.habit_id} fill={h.color} />
            ))}
            <LabelList
              dataKey="rate"
              position="right"
              formatter={(v: unknown) => formatPercent(v as number | null)}
              style={{ fill: theme.text, fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function WeekdayChart({ weekdays, theme, best, worst }: { weekdays: WeekdayStats[]; theme: ChartTheme; best: number | null; worst: number | null }) {
  if (weekdays.every((w) => w.applicable === 0)) return <EmptyState>Sin datos este mes.</EmptyState>
  const rows = weekdays.map((w) => ({ ...w, name: WEEKDAY_SHORT[w.weekday], pct: w.rate == null ? 0 : Math.round(w.rate * 100) }))
  return (
    <div className="h-56 lg:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: theme.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: theme.grid }} />
          <YAxis {...percentAxis} tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ fill: theme.grid, opacity: 0.4 }}
            content={({ active, payload }) => {
              const w = payload?.[0]?.payload as WeekdayStats | undefined
              return active && w ? <ChartTooltip title={WEEKDAY_NAMES[w.weekday]} ratio={w} /> : null
            }}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
            {rows.map((w) => (
              // Un solo color; mejor y peor día se señalan con etiqueta, no con otro color.
              <Cell key={w.weekday} fill={theme.series} fillOpacity={w.weekday === best || w.weekday === worst ? 1 : 0.55} />
            ))}
            <LabelList
              dataKey="weekday"
              position="top"
              formatter={(v: unknown) => (v === best ? 'mejor' : v === worst ? 'peor' : '')}
              style={{ fill: theme.axis, fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ------------------------------------------------------------------ Tabla de rachas
function HabitTable({ habits }: { habits: HabitStats[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="py-2 font-medium">Hábito</th>
            <th className="py-2 text-right font-medium">%</th>
            <th className="hidden py-2 text-right font-medium sm:table-cell">Días</th>
            <th className="py-2 text-right font-medium">Racha</th>
            <th className="py-2 text-right font-medium">Máx.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {habits.map((h) => (
            <tr key={h.habit_id}>
              <td className="py-2">
                <span className="flex items-center gap-2">
                  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: h.color }} />
                  <span className="max-w-40 truncate sm:max-w-none">{h.icon} {h.name}</span>
                  {h.archived && <span className="text-xs text-slate-400">(archivado)</span>}
                </span>
              </td>
              <td className="py-2 text-right font-medium tabular-nums">{formatPercent(h.rate)}</td>
              <td className="hidden py-2 text-right text-slate-500 tabular-nums sm:table-cell">{h.done}/{h.applicable}</td>
              <td className="py-2 text-right tabular-nums">
                <span className="inline-flex items-center gap-0.5">
                  {h.current_streak > 0 && <Icon name="flame" className="size-3.5 text-orange-500" />}
                  {h.current_streak}
                </span>
              </td>
              <td className="py-2 text-right text-slate-500 tabular-nums">{h.max_streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Rachas calculadas sobre todo el historial hasta fin de mes. Los días que no tocan no rompen la racha.
      </p>
    </div>
  )
}
