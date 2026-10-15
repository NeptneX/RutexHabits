// Calendario mensual: cada día muestra hábitos cumplidos / hábitos que tocaban,
// coloreado según el porcentaje. El mes vive en la URL (?month=2026-10) para
// que se pueda recargar o compartir el enlace sin perder el mes.
import { useNavigate, useSearchParams } from 'react-router'
import { daysApi } from '../api'
import { Card, ErrorBox, PageHeader, Spinner } from '../components/ui'
import { useApi } from '../hooks/useApi'
import { formatEs, fromISODate, mondayIndex, parseMonthKey, shiftMonth, todayISO, WEEKDAY_SHORT } from '../lib/dates'
import { LEVELS, levelFor, NEUTRAL } from '../lib/progress'

export default function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const today = todayISO()
  const currentMonth = today.slice(0, 7) // "2026-10"
  const month = parseMonthKey(params.get('month')) ? params.get('month')! : currentMonth
  const { data, error, loading, reload } = useApi(() => daysApi.calendar(month), [month])

  const goTo = (key: string) => setParams({ month: key })

  // Huecos al principio para que el día 1 caiga en su columna (lunes = 0).
  const leading = mondayIndex(parseMonthKey(month)!)

  return (
    <div>
      <PageHeader
        title={formatEs(parseMonthKey(month)!, 'LLLL yyyy')}
        onPrev={() => goTo(shiftMonth(month, -1))}
        onNext={() => goTo(shiftMonth(month, 1))}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
        actions={
          month !== currentMonth && (
            <button
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
              onClick={() => goTo(currentMonth)}
            >
              Hoy
            </button>
          )
        }
      />

      {error && <ErrorBox message={error} onRetry={reload} />}

      <Card className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label="Calendario">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {d}
            </div>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {!data && loading && (
            <div className="col-span-7">
              <Spinner />
            </div>
          )}
          {data?.days.map((day) => {
            const isFuture = day.date > today // comparar ISO como texto funciona
            const isToday = day.date === today
            const level = isFuture ? null : levelFor(day.done, day.total)
            // Hoy, si aún no está completo, no lo pintamos en "rojo": el día no ha acabado.
            const pending = isToday && day.done < day.total
            const color = pending || !level ? NEUTRAL : level.className
            return (
              <button
                key={day.date}
                onClick={() => navigate(`/day/${day.date}`)}
                aria-label={`${formatEs(day.date, "EEEE d 'de' MMMM")}: ${day.done} de ${day.total}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition hover:scale-[1.04] hover:shadow-md focus-visible:outline-2 focus-visible:outline-indigo-500 sm:aspect-[4/3] sm:rounded-xl ${color} ${
                  isToday ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''
                } ${isFuture ? 'opacity-60' : ''}`}
              >
                <span className="font-semibold">{fromISODate(day.date).getDate()}</span>
                {day.total > 0 && (
                  <span className="text-[10px] leading-none opacity-80 sm:text-xs">
                    {day.done}/{day.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Leyenda de colores */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        {LEVELS.map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`inline-block size-3.5 rounded ${l.className}`} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className={`inline-block size-3.5 rounded ${NEUTRAL}`} />
          Sin hábitos / pendiente
        </span>
      </div>
    </div>
  )
}
