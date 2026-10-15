import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy de desarrollo: el navegador pide /api/... a Vite (puerto 5173) y
    // Vite lo reenvía al backend (puerto 8000). Ventajas:
    //  - El frontend usa rutas relativas (/api) y no "sabe" dónde está el backend.
    //  - Funciona al abrir la app desde el móvil en la misma red (npm run dev -- --host),
    //    donde "localhost:8000" apuntaría al propio móvil.
    // El backend mantiene CORS configurado por si se usa VITE_API_URL apuntando directo.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
