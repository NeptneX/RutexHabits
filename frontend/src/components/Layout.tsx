// Estructura común: cabecera con navegación (escritorio) y barra inferior
// tipo app (móvil). <Outlet /> es donde React Router pinta la página activa.
import { NavLink, Outlet } from 'react-router'
import { useTheme } from '../hooks/useTheme'
import { Icon, type IconName } from './Icon'
import { IconButton } from './ui'

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Hoy', icon: 'today', end: true },
  { to: '/calendar', label: 'Calendario', icon: 'calendar' },
  { to: '/habits', label: 'Hábitos', icon: 'list' },
  { to: '/weight', label: 'Peso', icon: 'scale' },
  { to: '/stats', label: 'Estadísticas', icon: 'chart' },
]

const THEME_ICON = { light: 'sun', dark: 'moon', system: 'monitor' } as const
const THEME_LABEL = { light: 'Tema claro', dark: 'Tema oscuro', system: 'Tema del sistema' } as const

export default function Layout() {
  const { theme, cycle } = useTheme()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold">
            <img src="/favicon.svg" alt="" className="size-7" />
            <span>Hábitos</span>
          </NavLink>
          <nav className="hidden gap-1 md:flex" aria-label="Principal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <IconButton icon={THEME_ICON[theme]} label={`${THEME_LABEL[theme]} (cambiar)`} onClick={cycle} />
        </div>
      </header>

      {/* pb extra en móvil para que la barra inferior no tape contenido */}
      <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:pb-10">
        <Outlet />
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95"
      >
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
