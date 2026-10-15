// Definición de rutas. Todas las páginas comparten el Layout (cabecera + navegación).
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import Layout from './components/Layout'
import CalendarPage from './pages/CalendarPage'
import DayPage from './pages/DayPage'
import HabitsPage from './pages/HabitsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DayPage /> }, // "/" = hoy
      { path: 'day/:date', element: <DayPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'habits', element: <HabitsPage /> },
      // Carga diferida (code splitting): Peso y Estadísticas usan Recharts, que es
      // pesado. Así ese código solo se descarga al visitar esas páginas.
      { path: 'weight', lazy: async () => ({ Component: (await import('./pages/WeightPage')).default }) },
      { path: 'stats', lazy: async () => ({ Component: (await import('./pages/StatsPage')).default }) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
