import type { ReactNode } from 'react'

/** Número destacado con etiqueta y detalle (KPI). */
export function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  )
}

/** Variación con flecha; `goodWhen` indica si subir es bueno, malo o neutro
 * (el peso es neutro: según tu objetivo, bajar puede ser bueno o no). */
export function Delta({ value, suffix, goodWhen = 'up', digits = 1 }: {
  value: number | null
  suffix: string
  goodWhen?: 'up' | 'down' | 'neutral'
  digits?: number
}) {
  if (value == null) return <span>—</span>
  const rounded = Number(value.toFixed(digits))
  if (rounded === 0) return <span>±0{suffix}</span>
  const up = rounded > 0
  const good = (goodWhen === 'up') === up
  const color =
    goodWhen === 'neutral'
      ? 'text-slate-700 dark:text-slate-200'
      : good
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400'
  return (
    <span className={color}>
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {rounded.toFixed(digits)}
      {suffix}
    </span>
  )
}
