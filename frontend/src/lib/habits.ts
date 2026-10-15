import { WEEKDAY_SHORT } from './dates'

export const WEEKDAY_PRESETS: { label: string; days: number[] }[] = [
  { label: 'Todos', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Laborables', days: [0, 1, 2, 3, 4] },
  { label: 'Fin de semana', days: [5, 6] },
]

/** Texto legible de los días: "Todos los días", "Laborables", "L · X · V"... */
export function describeWeekdays(days: number[]) {
  const preset = WEEKDAY_PRESETS.find((p) => p.days.length === days.length && p.days.every((d) => days.includes(d)))
  if (preset) return preset.label === 'Todos' ? 'Todos los días' : preset.label
  return days.map((d) => WEEKDAY_SHORT[d]).join(' · ')
}
