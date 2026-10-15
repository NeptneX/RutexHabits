// Colores de las gráficas para cada tema. Recharts dibuja SVG con colores
// pasados como props (no clases de Tailwind), así que necesitamos los
// valores en JS y saber si el modo oscuro está activo.
import { useEffect, useState } from 'react'

const LIGHT = {
  grid: '#e2e8f0',
  axis: '#64748b',
  text: '#0f172a',
  muted: '#94a3b8', // puntos de peso diario (secundarios)
  series: '#2a78d6', // serie principal (media móvil, barras)
  surface: '#ffffff',
  // Rampa secuencial de un solo tono (verde) para el heatmap: claro -> oscuro
  heat: ['#e2e8f0', '#c6f0db', '#7fd8ac', '#2fb47c', '#0b7a4f'],
}

const DARK: typeof LIGHT = {
  grid: '#1e293b',
  axis: '#94a3b8',
  text: '#f1f5f9',
  muted: '#64748b',
  series: '#3987e5',
  surface: '#0f172a',
  // En oscuro la rampa se invierte: "poco" queda cerca del fondo.
  heat: ['#1e293b', '#0f3d2c', '#13684a', '#1f9e6c', '#5fd3a0'],
}

export type ChartTheme = typeof LIGHT

/** Devuelve la paleta activa y se actualiza al cambiar la clase .dark de <html>. */
export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark ? DARK : LIGHT
}

/** Nivel 0..4 de la rampa del heatmap según el % (null = no tocaba nada). */
export function heatLevel(done: number, total: number): number | null {
  if (total === 0) return null
  const rate = done / total
  if (rate === 0) return 0
  if (rate < 0.5) return 1
  if (rate < 0.8) return 2
  if (rate < 1) return 3
  return 4
}
