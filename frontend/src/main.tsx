import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyThemeToDocument, useAppearanceStore } from './state/appearance'

// Tema antes del primer render (decisión 77): sin esto se vería un instante
// el tema por defecto de index.css antes del elegido.
applyThemeToDocument(useAppearanceStore.getState().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
