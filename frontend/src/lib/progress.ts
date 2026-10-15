// Escala de color según el % de cumplimiento. Se usa en el calendario y el
// heatmap para que ambos hablen el mismo "idioma visual".
// Las clases están escritas completas para que Tailwind las detecte.

export interface ProgressLevel {
  label: string
  className: string
}

export const LEVELS: ProgressLevel[] = [
  { label: '0 %', className: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200' },
  { label: '1–49 %', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  { label: '50–79 %', className: 'bg-lime-200 text-lime-950 dark:bg-lime-900 dark:text-lime-100' },
  { label: '80–99 %', className: 'bg-emerald-300 text-emerald-950 dark:bg-emerald-700 dark:text-emerald-50' },
  { label: '100 %', className: 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-emerald-950' },
]

export const NEUTRAL = 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'

export function levelFor(done: number, total: number): ProgressLevel | null {
  if (total === 0) return null
  const rate = done / total
  if (rate === 0) return LEVELS[0]
  if (rate < 0.5) return LEVELS[1]
  if (rate < 0.8) return LEVELS[2]
  if (rate < 1) return LEVELS[3]
  return LEVELS[4]
}

/** 0.756 -> "76 %" ; null -> "—" */
export const formatPercent = (rate: number | null | undefined, digits = 0) =>
  rate == null ? '—' : `${(rate * 100).toFixed(digits)} %`
