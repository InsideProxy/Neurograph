# CLAUDE.md — frontend

Reglas para trabajar en `frontend/`. Las generales están en el CLAUDE.md de la raíz.

## Leer antes de tocar

- Aspecto o interacción: `docs/criterios-diseno.md`.
- Todo lo que se dibuja o se exporta: `docs/criterios-funcionales.md` §10 y §11. Lo que codifica un dato (el color de la red, el grosor del peso, el trazo de la evidencia) no se cambia por diseño.

## Reglas

- **Colores de datos.** `NETWORK_COLORS` (`src/theme/networks.ts`) son datos extraídos de cada atlas y no se modifican. El amarillo `HOVER_HIGHLIGHT_COLOR` queda reservado para el resaltado al pasar el ratón.
- **Lógica pura.** Va en `src/logic/`, separada de React y three.js, y es lo único que lleva tests (vitest). Los componentes se comprueban visualmente.
- **Clientes de la API** (`src/data/*Api.ts`): `fetch`, error si `!response.ok` y conversión a camelCase. El estado de cada petición es una unión discriminada: cargando, error o resultado.
- **Efectos.** Lo que tiene efectos secundarios (por ejemplo `OrbitControls`) se crea en `useEffect` con su `dispose()`, nunca en `useMemo`, porque `StrictMode` duplica las factorías. Los elementos `threeXxx` se registran con `extend`.
- **Estilos.** Se reutilizan las variables CSS y los patrones existentes; no se añaden colores sueltos.

## Verificar (en `frontend/`)

- `npx --no -- tsc -b`, `npm test`, `npm run lint` y `npm run build`. El `--no` impide que `npx` descargue un paquete de npm si no encuentra TypeScript instalado: sin él, ejecutado fuera de `frontend/` bajaría y ejecutaría el paquete `tsc`, que no es TypeScript.
- La comprobación visual automática usa un navegador headless propio, nunca la ventana del usuario.
- `node_modules` se instala por separado en cada sistema operativo.
