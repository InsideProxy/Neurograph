import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyThemeToDocument, useAppearanceStore } from './state/appearance'

// Único sitio que aplica el tema al arrancar (D3 de docs/decisiones-diseno.md): no es solo un
// parpadeo que evitar. Sin esta llamada la interfaz se quedaría fija en el
// tema por defecto de index.css, mientras que los colores de dibujo (que
// leen el store, no el DOM) sí siguen el tema guardado -- un desajuste
// permanente, no un instante.
applyThemeToDocument(useAppearanceStore.getState().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
