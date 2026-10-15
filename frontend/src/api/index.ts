// Una función por endpoint. Los componentes importan desde aquí y nunca
// construyen URLs a mano: si cambia una ruta, solo se toca este archivo.
import type {
  CalendarData,
  DayData,
  Habit,
  HabitInput,
  HabitLog,
  HabitPatch,
  ISODate,
  MonthlyStats,
  Task,
  TaskInput,
  WeightEntry,
  WeightSeries,
} from '../types/api'
import { http, query } from './client'

export const habitsApi = {
  list: (includeArchived = false) => http.get<Habit[]>(`/habits${query({ include_archived: includeArchived })}`),
  create: (data: HabitInput) => http.post<Habit>('/habits', data),
  update: (id: number, data: HabitPatch) => http.patch<Habit>(`/habits/${id}`, data),
  setLog: (id: number, date: ISODate, done: boolean) => http.put<HabitLog>(`/habits/${id}/logs/${date}`, { done }),
}

export const tasksApi = {
  create: (data: TaskInput) => http.post<Task>('/tasks', data),
  update: (id: number, data: Partial<TaskInput>) => http.patch<Task>(`/tasks/${id}`, data),
  remove: (id: number) => http.delete(`/tasks/${id}`),
}

export const weightApi = {
  series: (months: number) => http.get<WeightSeries>(`/weight${query({ months })}`),
  upsert: (date: ISODate, weight_kg: number, note?: string | null) =>
    http.put<WeightEntry>(`/weight/${date}`, { weight_kg, note: note || null }),
  remove: (date: ISODate) => http.delete(`/weight/${date}`),
}

export const daysApi = {
  get: (date: ISODate) => http.get<DayData>(`/days/${date}`),
  calendar: (month: string) => http.get<CalendarData>(`/calendar${query({ month })}`),
}

export const statsApi = {
  monthly: (month: string) => http.get<MonthlyStats>(`/stats/monthly${query({ month })}`),
}
