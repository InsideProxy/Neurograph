# CLAUDE.md — frontend

Reglas para trabajar en `frontend/`. Las generales están en el CLAUDE.md de la raíz.

## Leer antes de tocar

- Aspecto o interacción: `docs/criterios-diseno.md`.
- Todo lo que se dibuja o se exporta: `docs/criterios-funcionales.md` §10 y §11. Lo que codifica un dato (el color de la red, el grosor del peso, el trazo de la evidencia) no se cambia por diseño.

## Reglas

- **Colores de datos.** `NETWORK_COLORS` (`src/theme/networks.ts`) son datos extraídos de cada atlas y no se modifican. El color de resaltado al pasar el ratón (token `hoverHighlight`: amarillo, y ocre en Claro) y el azul de las marcas (`mark`) quedan reservados para eso.
- **Lógica pura y tests.** La lógica pura va en `src/logic/` (la de colores, en `src/theme/`), separada de React; three.js solo entra en la que trabaja con sus objetos (`capture3d`, `cortexOcclusion`, `textSprite`). Lleva sus tests (vitest), igual que los stores de `src/state/`; la de los scripts de `scripts/`, junto a ellos, con los suyos. Los componentes pueden llevar tests de marcado (`react-dom/server`) o de conexión (que leen su código) donde protejan una regla. Lo visual se comprueba en un navegador headless (ver «Verificar»).
- **Clientes de la API** (`src/data/api.ts` y `src/data/*Api.ts`): `fetch`, error si `!response.ok` y conversión a camelCase. El estado de cada petición es una unión discriminada: cargando, error o resultado.
- **Efectos.** Lo que tiene efectos secundarios (por ejemplo `OrbitControls`) se crea en `useEffect` con su `dispose()`, nunca en `useMemo`, porque `StrictMode` duplica las factorías. Los elementos `threeXxx` se registran con `extend`.
- **Estilos.** Se reutilizan las variables CSS y los patrones existentes; no se añaden colores sueltos.

## Verificar (en `frontend/`)

- `npx --no -- tsc -b`, `npm test`, `npm run lint` y `npm run build`. El `--no` impide que `npx` descargue un paquete de npm si no encuentra TypeScript instalado: sin él, ejecutado fuera de `frontend/` bajaría y ejecutaría el paquete `tsc`, que no es TypeScript.
- La comprobación visual automática usa un navegador headless propio, nunca la ventana del usuario.
- `node_modules` se instala por separado en cada sistema operativo. `npm run dev`, `npm run build` y `npm run tauri` ejecutan antes `scripts/prepare.mjs`, que instala lo que falte (H5); un paso de preparación nuevo es una entrada más en su lista `STEPS`.
