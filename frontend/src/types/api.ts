// Tipos que reflejan los schemas Pydantic del backend (app/schemas/*).
// Si cambias un schema allí, actualiza el tipo aquí.

/** Fecha en formato ISO "YYYY-MM-DD". */
export type ISODate = string

export interface Habit {
  id: number
  name: string
  color: string
  icon: string
  /** 0 = lunes ... 6 = domingo */
  weekdays: number[]
  created_at: string
  archived_at: ISODate | null
  archived: boolean
}

export interface HabitInput {
  name: string
  color: string
  icon: string
  weekdays: number[]
  start_date?: ISODate | null
}

export type HabitPatch = Partial<Omit<HabitInput, 'start_date'>> & { archived?: boolean }

export interface HabitLog {
  habit_id: number
  date: ISODate
  done: boolean
}

export interface Task {
  id: number
  title: string
  date: ISODate
  done: boolean
  notes: string | null
}

export interface TaskInput {
  title: string
  date: ISODate
  notes?: string | null
  done?: boolean
}

export interface WeightEntry {
  date: ISODate
  weight_kg: number
  note: string | null
}

export interface WeightPoint extends WeightEntry {
  moving_avg_7d: number
}

export interface WeightSeries {
  months: number
  start: ISODate
  end: ISODate
  entries: WeightPoint[]
}

export interface DayHabit {
  id: number
  name: string
  color: string
  icon: string
  archived: boolean
  done: boolean
}

export interface DaySummary {
  date: ISODate
  done: number
  total: number
}

export interface DayData {
  date: ISODate
  can_log: boolean
  summary: DaySummary
  habits: DayHabit[]
  tasks: Task[]
  weight: WeightEntry | null
}

export interface CalendarData {
  month: string
  days: DaySummary[]
}

export interface Ratio {
  done: number
  applicable: number
  /** Tanto por uno (0.75 = 75 %). null si no había nada que cumplir. */
  rate: number | null
}

export interface HabitStats extends Ratio {
  habit_id: number
  name: string
  color: string
  icon: string
  archived: boolean
  current_streak: number
  max_streak: number
}

export interface WeekdayStats extends Ratio {
  weekday: number
}

export interface MonthlyStats {
  month: string
  start: ISODate
  end: ISODate
  overall: Ratio
  previous: Ratio & { month: string }
  overall_delta: number | null
  habits: HabitStats[]
  weekdays: WeekdayStats[]
  best_weekday: number | null
  worst_weekday: number | null
  weight: { start: number | null; end: number | null; change: number | null; entries: number }
  heatmap: DaySummary[]
}
