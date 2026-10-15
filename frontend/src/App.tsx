// Definición de rutas. Todas las páginas comparten el Layout (cabecera + navegación).
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import Layout from './components/Layout'
import CalendarPage from './pages/CalendarPage'
import DayPage from './pages/DayPage'
import HabitsPage from './pages/HabitsPage'
import StatsPage from './pages/StatsPage'
import WeightPage from './pages/WeightPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DayPage /> }, // "/" = hoy
      { path: 'day/:date', element: <DayPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'habits', element: <HabitsPage /> },
      { path: 'weight', element: <WeightPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
