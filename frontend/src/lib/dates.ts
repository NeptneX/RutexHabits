// Utilidades de fechas con date-fns. Todas las fechas viajan como texto
// "YYYY-MM-DD"; aquí se convierten a Date (hora local) y viceversa.
import { addMonths, format, isValid, parse, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** Date -> "2026-10-15" */
export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd')

/** "2026-10-15" -> Date local (parseISO no aplica zona horaria a fechas sin hora). */
export const fromISODate = (iso: string) => parseISO(iso)

export const todayISO = () => toISODate(new Date())

/** Date -> "2026-10" */
export const toMonthKey = (date: Date) => format(date, 'yyyy-MM')

/** "2026-10" -> Date del día 1 (o null si no es válido). */
export function parseMonthKey(key: string | null): Date | null {
  if (!key) return null
  const date = parse(key, 'yyyy-MM', new Date())
  return isValid(date) ? date : null
}

export const shiftMonth = (key: string, delta: number) => toMonthKey(addMonths(parseMonthKey(key)!, delta))

/** Formato en español con la primera letra en mayúscula: "Octubre 2026". */
export function formatEs(date: Date | string, pattern: string) {
  const d = typeof date === 'string' ? fromISODate(date) : date
  const text = format(d, pattern, { locale: es })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Índice 0 = lunes, igual que en el backend. */
export const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** getDay() de JS empieza en domingo (0); lo pasamos a lunes = 0. */
export const mondayIndex = (date: Date) => (date.getDay() + 6) % 7
