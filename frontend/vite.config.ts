import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Puerto fijo para que coincida siempre con el "devUrl" de
  // src-tauri/tauri.conf.json: si el puerto 5173 estuviera ocupado (p.
  // ej. un "npm run dev" anterior que no se cerró bien), Vite arrancaría
  // en otro puerto en silencio y Tauri se quedaría mirando una ventana en
  // blanco sin ningún error claro -- mismo problema que ya documentó la
  // decisión de CORS del backend el 28/08/2026, aquí resuelto fijando el
  // puerto en vez de aceptar cualquiera.
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Evita que Vite se reinicie al detectar los archivos que genera
      // la propia compilación de Rust (carpeta target/) dentro de
      // src-tauri.
      ignored: ['**/src-tauri/**'],
    },
  },
})
