import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system' // localStorage puede no estar disponible (modo privado...)
  }
}

/** Tema claro/oscuro/sistema, persistido en localStorage. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStored)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    try {
      if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* sin persistencia: no pasa nada */
    }
    // Si sigue al sistema, reaccionamos a cambios del SO en vivo.
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const cycle = () => setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'))
  return { theme, setTheme, cycle }
}
