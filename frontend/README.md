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
npm test           # pruebas de la lógica de filtrado (src/logic)
```

## Estructura

```
src/
├── types/domain.ts        tipos mínimos (temporales, ver comentario en el archivo)
├── theme/networks.ts       colores y nombres de red, compartidos entre vistas
├── state/
│   ├── selection.ts        selección compartida entre las dos vistas
│   └── filters.ts          filtros compartidos (redes, tipo, peso mínimo)
├── logic/visibility.ts     lógica pura de filtrado (con pruebas en visibility.test.ts)
├── data/demo.ts            datos SINTÉTICOS de demostración, etiquetados
├── components/
│   ├── Connectogram.tsx    visualización 1 (diagrama de cuerdas, D3)
│   ├── Brain3D.tsx         visualización 2 (cerebro 3D, react-three-fiber)
│   ├── FilterPanel.tsx     filtros por red, tipo de conectividad y peso
│   └── DetailPanel.tsx     detalle de la selección actual
└── App.tsx                 monta filtros + las dos vistas + detalle
```

## Filtros e interacción implementados hasta ahora

- Ocultar/mostrar por red cognitiva (con el mismo color en las dos vistas).
- Ocultar/mostrar por tipo de conectividad (estructural / funcional / efectiva).
- Umbral mínimo de peso de conexión.
- Selección de un nodo o una conexión, sincronizada entre las dos vistas
  (sección 5.3) y mostrada en el panel de detalle.

Pendiente (fases posteriores): datos reales en vez de `demo.ts`, tractos
como geometría real en vez de líneas rectas, y las demás propiedades del
panel de detalle (evidencia, estudios, homologías, fenotipos) en cuanto
existan en la API.
