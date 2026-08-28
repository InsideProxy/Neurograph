# NeuroGraph — frontend

Interfaz gráfica y visualización (Connectograma + Cerebro 3D, sección 5 de
la especificación). Vite + React + TypeScript + Three.js
(`@react-three/fiber`) + D3.

En esta fase es una vista de desarrollo con datos sintéticos claramente
etiquetados (`src/data/demo.ts`) — sirve para demostrar que las dos
visualizaciones se sincronizan (sección 5.3), no para mostrar ciencia real
todavía. Cuando exista la API (Fase 3-4), `demo.ts` se sustituye por
llamadas reales.

No hay todavía empaquetado de escritorio (Tauri): esta sesión no tenía
disponible el compilador de Rust necesario. Por ahora se ejecuta como app
web local; envolverla en Tauri es un paso posterior que no cambia nada del
código de aquí.

## Poner en marcha

```bash
cd frontend
npm install
npm run dev       # servidor de desarrollo con recarga en caliente
npm run build      # build de producción, comprueba también los tipos
```

## Estructura

```
src/
├── types/domain.ts       tipos mínimos (temporales, ver comentario en el archivo)
├── state/selection.ts     estado de selección compartido entre las dos vistas
├── data/demo.ts           datos SINTÉTICOS de demostración, etiquetados
├── components/
│   ├── Connectogram.tsx   visualización 1 (diagrama de cuerdas, D3)
│   └── Brain3D.tsx        visualización 2 (cerebro 3D, react-three-fiber)
└── App.tsx                monta ambas vistas lado a lado
```
