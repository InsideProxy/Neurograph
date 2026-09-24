# Rediseño de la interfaz · Fase 1: base de temas. Plan de implementación

> **Para agentes:** OBLIGATORIO: usar superpowers:subagent-driven-development (si hay subagentes) o superpowers:executing-plans para ejecutar este plan. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** cuatro temas (Original, Grafito, Noche y Claro) elegibles desde un engranaje, con la tipografía Atkinson Hyperlegible instalada con la app, todos los colores saliendo de tokens y la exportación JPEG correcta en cualquier tema. Los colores de red siguen siendo los originales: la paleta suave es la fase 2.

**Arquitectura:**

- **Colores de interfaz:** variables CSS por `data-theme` en `index.css`.
- **Colores de dibujo (SVG y three.js):** el objeto TypeScript `DRAW_TOKENS`, que los componentes leen con `useDrawColors()`.
- **Elección del tema:** un store de zustand la guarda y la persiste en `localStorage`.
- **Exportación:** reescribe los colores del clon del SVG a partir de atributos `data-ng-*`. El cerebro 3D vuelve a dibujarse con los colores de exportación antes de la captura.

**Tecnología:** React 19, TypeScript, Vite 8, zustand 5, three.js con @react-three/fiber 9, vitest 4 (entorno node, sin DOM) y oxlint.

**Spec:** `docs/rediseno-interfaz-diseno.md`, secciones 4, 7, 9, 10 y 11.1.

**Dónde se trabaja:**

- Worktree `~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz`, rama `rediseno-interfaz`.
- `frontend/node_modules` es un enlace a la copia principal. No ejecutes `npm install`: esta fase no añade dependencias.

**Convenciones:**

- Identificadores en inglés y comentarios en castellano, como el código actual. Donde el spec dice `tema`, `modoPaleta` o `paraExportar`, aquí se escribe `theme`, `paletteMode` y `forExport`.
- **Rutas absolutas en todos los comandos:** cada bloque empieza con `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz` o con `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend`. No se da por hecho el directorio de la terminal.
- Comandos, desde `frontend/`:
  - Una prueba: `npx vitest run <ruta>`. Todas: `npm test`.
  - Tipos: `npx tsc -b`.
  - Lint: `npm run lint`. La línea base da **9 avisos previos** (3 `set-state-in-effect`, 4 `preserve-manual-memoization`, 2 `exhaustive-deps`) y ningún error.
  - Compilación: `npm run build`.
- `tsconfig.app.json` solo carga los tipos de `vite/client`. Las pruebas que leen archivos usan las importaciones de Vite (`?raw`, `import.meta.glob`), no `node:fs`.
- Mensajes de commit en castellano sin tildes, como el historial, terminados en la línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Mapa de archivos

Nuevos:

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/theme/themes.ts` | Ids de tema, nombre y descripción para Ajustes, `DRAW_TOKENS` y `exportDrawTokens` |
| `frontend/src/theme/colors.ts` | `resolveNetworkColor`, `exportColorFor` y `exportResolverFor` (funciones puras) |
| `frontend/src/theme/useDrawColors.ts` | `drawColorsFor` (pura) y el hook `useDrawColors` |
| `frontend/src/state/appearance.ts` | Store del tema, lectura y escritura en `localStorage`, `applyThemeToDocument` |
| `frontend/src/logic/exportPalette.ts` | `applyExportColors` y `EXPORT_FONT_FAMILY` |
| `frontend/src/components/SettingsMenu.tsx` | Engranaje y panel de Ajustes |
| `frontend/src/assets/fonts/` | Cuatro `woff2` |
| `frontend/public/licenses/` | Las dos licencias OFL, que Vite copia a `dist` |
| Pruebas | `theme/themes.test.ts`, `theme/colors.test.ts`, `state/appearance.test.ts` y `logic/exportPalette.test.ts` |

Modificados:

- `main.tsx`, `index.css`, `App.css` y `App.tsx` (en `App.tsx` solo se añade el engranaje a la barra).
- `logic/exportImage.ts` y `logic/surfaceParcels.ts`, con su prueba.
- Componentes: `Connectogram.tsx`, `Hemisferios.tsx`, `DetailPanel.tsx`, `FilterPanel.tsx`, `FunctionSynthesisTab.tsx`, `Brain3D.tsx`, `PaintedCortex.tsx`, `ReferenceMesh.tsx`, `Tractography3D.tsx` y `TractographyNodes3D.tsx`.
- Documentos: `docs/analisis-arquitectura.md` (decisión 77) y `docs/rediseno-interfaz-diseno.md` (dos filas nuevas).

**No se toca ningún valor de `theme/networks.ts`.**

## Diferencias con el spec en esta fase

La Task 9 las anota en el spec (sección 9) y en la decisión 77:

- **`UI_TOKENS`:** no existe en TypeScript. Los tokens de interfaz viven solo en `index.css`. La vista previa de cada tema en Ajustes los toma de ahí: cada bloque de tema se aplica también a `[data-theme-preview="<id>"]`, así que no se repiten en TypeScript.
- **Modo de paleta:** `resolveNetworkColor(key)` y `exportColorFor(ref, kind, theme)` todavía no lo reciben (`kind` es el tipo de atributo, color u opacidad), y `effectivePaletteMode` no existe. Llegan con la paleta suave, en la fase 2.
- **Nombre del hook:** `useDrawColors({ paraExportar })` del spec se escribe `useDrawColors(forExport)`.
- **Token nuevo:** `nodeGap`, el contorno de los nodos del diagrama de síntesis. Hacía falta para que ningún color quede fijo.

---

## Chunk 1: colores y tema (módulos puros)

### Task 1: tokens de dibujo y resolución de colores

**Files:**
- Create: `frontend/src/theme/themes.ts`
- Create: `frontend/src/theme/colors.ts`
- Test: `frontend/src/theme/themes.test.ts`
- Test: `frontend/src/theme/colors.test.ts`

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/theme/themes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ACCENT_SELECTED_COLOR,
  HOMOLOGY_HIGHLIGHT_COLOR,
  HOVER_HIGHLIGHT_COLOR,
  INTER_HEMISPHERE_COLOR,
  INTRA_HEMISPHERE_COLOR,
  NEUTRAL_COLOR,
} from "./networks";
import { DEFAULT_THEME, DRAW_TOKENS, THEME_IDS, exportDrawTokens, hexToSrgb, isThemeId } from "./themes";

describe("DRAW_TOKENS", () => {
  it("el tema original conserva los colores y opacidades de hoy", () => {
    const o = DRAW_TOKENS.original;
    expect(o.edge).toBe(NEUTRAL_COLOR);
    expect(o.label).toBe(NEUTRAL_COLOR);
    expect(o.nodeRing).toBe(NEUTRAL_COLOR);
    expect(o.selected).toBe(ACCENT_SELECTED_COLOR);
    expect(o.hoverHighlight).toBe(HOVER_HIGHLIGHT_COLOR);
    expect(o.intra).toBe(INTRA_HEMISPHERE_COLOR);
    expect(o.inter).toBe(INTER_HEMISPHERE_COLOR);
    expect(o.homology).toBe(HOMOLOGY_HIGHLIGHT_COLOR);
    expect(o.sceneBg).toBe("#1d1e26");
    expect(o.nodeGap).toBe("#0b0c10");
    expect(o.hemiFill).toBe("none");
    expect(o.dash).toBe("6 4");
    expect([o.edgeOpacityConnectogram, o.edgeOpacityHemispheres, o.edgeOpacity3d]).toEqual([0.55, 0.6, 0.55]);
    expect([o.edgeOpacityHoverOther, o.edgeOpacityHoverSelected, o.edgeOpacitySelected]).toEqual([0.12, 0.45, 0.95]);
    expect(o.cortexSulcus).toEqual([0.35, 0.35, 0.35]);
    expect(o.cortexGyrus).toEqual([0.72, 0.72, 0.72]);
    expect(o.cortexMedialWall).toEqual([0.25, 0.25, 0.25]);
    expect(o.cortexNoData).toEqual([0.55, 0.55, 0.55]);
  });

  it("los cuatro temas definen los mismos tokens", () => {
    const keys = Object.keys(DRAW_TOKENS.original).sort();
    for (const id of THEME_IDS) expect(Object.keys(DRAW_TOKENS[id]).sort()).toEqual(keys);
  });

  it("la exportación usa el tema 1 tal cual y Claro para los demás", () => {
    expect(exportDrawTokens("original")).toBe(DRAW_TOKENS.original);
    for (const id of ["grafito", "noche", "claro"] as const) {
      expect(exportDrawTokens(id)).toBe(DRAW_TOKENS.claro);
    }
  });

  it("los temas 2 a 4 comparten el discontinuo, porque la exportación no lo reescribe", () => {
    for (const id of ["grafito", "noche"] as const) expect(DRAW_TOKENS[id].dash).toBe(DRAW_TOKENS.claro.dash);
  });
});

describe("utilidades de tema", () => {
  it("reconoce los ids de tema; el tema por defecto es Grafito", () => {
    expect(DEFAULT_THEME).toBe("grafito");
    expect(isThemeId("noche")).toBe(true);
    expect(isThemeId("azul")).toBe(false);
    expect(isThemeId(3)).toBe(false);
  });

  it("convierte un hex a sRGB 0-1", () => {
    expect(hexToSrgb("#ff8000")).toEqual([1, 128 / 255, 0]);
  });
});
```

`frontend/src/theme/colors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NEUTRAL_COLOR } from "./networks";
import { DRAW_TOKENS } from "./themes";
import { exportColorFor, exportResolverFor, resolveNetworkColor } from "./colors";

describe("resolveNetworkColor", () => {
  it("devuelve el color original del atlas", () => {
    expect(resolveNetworkColor("cole-anticevic.visual")).toBe("#0000ff");
  });

  it("una red desconocida usa el gris de «sin clasificar»", () => {
    expect(resolveNetworkColor("no-existe")).toBe("#8a8a8a");
    // Claves que existen en cualquier objeto por su prototipo, no como red.
    expect(resolveNetworkColor("constructor")).toBe("#8a8a8a");
  });
});

describe("exportColorFor", () => {
  it("resuelve colores de red con el prefijo net:", () => {
    expect(exportColorFor("net:cole-anticevic.default", "grafito")).toBe("#ff0000");
  });

  it("con el tema original, los colores de dibujo son los de hoy", () => {
    expect(exportColorFor("edge", "original")).toBe(NEUTRAL_COLOR);
    expect(exportColorFor("edgeOpacityConnectogram", "original")).toBe("0.55");
    expect(exportColorFor("hemiFill", "original")).toBe("none");
  });

  it("con los temas 2 a 4, los de Claro", () => {
    expect(exportColorFor("edge", "noche")).toBe(DRAW_TOKENS.claro.edge);
    expect(exportColorFor("selected", "grafito")).toBe(DRAW_TOKENS.claro.selected);
  });

  it("devuelve null para referencias desconocidas o que no son un color", () => {
    expect(exportColorFor("inventado", "original")).toBeNull();
    expect(exportColorFor("cortexSulcus", "original")).toBeNull();
  });

  it("exportResolverFor fija el tema", () => {
    expect(exportResolverFor("claro")("edge")).toBe(DRAW_TOKENS.claro.edge);
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/themes.test.ts src/theme/colors.test.ts`
Expected: FAIL, porque no existen `./themes` ni `./colors`.

- [ ] **Step 3: implementar `frontend/src/theme/themes.ts`**

```ts
// Temas de NeuroGraph (decisión 77; docs/rediseno-interfaz-diseno.md,
// secciones 4.1 y 4.2). Los colores de interfaz viven en index.css, un
// bloque por `data-theme`. Aquí están los de DIBUJO: lo que se pinta dentro
// de los SVG y del lienzo 3D, que no pueden leer variables CSS. En
// "original" son exactamente los valores de hoy (constantes de la decisión
// 18 y valores que antes estaban sueltos en cada componente).
import {
  ACCENT_SELECTED_COLOR,
  HOMOLOGY_HIGHLIGHT_COLOR,
  HOVER_HIGHLIGHT_COLOR,
  INTER_HEMISPHERE_COLOR,
  INTRA_HEMISPHERE_COLOR,
  NEUTRAL_COLOR,
} from "./networks";

export type ThemeId = "original" | "grafito" | "noche" | "claro";
export const THEME_IDS: readonly ThemeId[] = ["original", "grafito", "noche", "claro"];
export const DEFAULT_THEME: ThemeId = "grafito";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export interface ThemeInfo {
  number: number;
  name: string;
  description: string;
  // Solo para la vista previa de Ajustes; los valores que usa la app están
  // en index.css.
  preview: { bg: string; panel: string; border: string };
}

export const THEME_INFO: Record<ThemeId, ThemeInfo> = {
  original: {
    number: 1,
    name: "Original",
    description: "Los colores actuales de NeuroGraph",
    preview: { bg: "#15161c", panel: "#1d1e26", border: "#34343e" },
  },
  grafito: {
    number: 2,
    name: "Grafito",
    description: "Oscuro neutro, tonos suaves",
    preview: { bg: "#0f1115", panel: "#16191e", border: "#262b33" },
  },
  noche: {
    number: 3,
    name: "Noche",
    description: "Oscuro azulado, algo más de intensidad",
    preview: { bg: "#0a0e17", panel: "#111726", border: "#1f2940" },
  },
  claro: {
    number: 4,
    name: "Claro",
    description: "Fondo claro, como la imagen exportada",
    preview: { bg: "#f3f2ee", panel: "#ffffff", border: "#e2e0d9" },
  },
};

// sRGB 0-1, no lineal: así "original" conserva exactamente los grises de
// hoy de logic/surfaceParcels.ts (0,35 / 0,72 / 0,25 / 0,55).
export type Srgb = readonly [number, number, number];

export interface DrawTokens {
  edge: string;
  edgeOpacityConnectogram: number;
  edgeOpacityHemispheres: number;
  edgeOpacity3d: number;
  edgeOpacityHoverOther: number;
  edgeOpacityHoverSelected: number;
  edgeOpacitySelected: number;
  dash: string;
  selected: string;
  hoverHighlight: string;
  label: string;
  nodeRing: string;
  // Contorno oscuro de los nodos del diagrama de síntesis de IA.
  nodeGap: string;
  intra: string;
  inter: string;
  hemiFill: string;
  homology: string;
  sceneBg: string;
  cortexSulcus: Srgb;
  cortexGyrus: Srgb;
  cortexMedialWall: Srgb;
  cortexNoData: Srgb;
}

function gray(value: number): Srgb {
  return [value, value, value];
}

export function hexToSrgb(hex: string): Srgb {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export const DRAW_TOKENS: Record<ThemeId, DrawTokens> = {
  original: {
    edge: NEUTRAL_COLOR,
    edgeOpacityConnectogram: 0.55,
    edgeOpacityHemispheres: 0.6,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.12,
    edgeOpacityHoverSelected: 0.45,
    edgeOpacitySelected: 0.95,
    dash: "6 4",
    selected: ACCENT_SELECTED_COLOR,
    hoverHighlight: HOVER_HIGHLIGHT_COLOR,
    label: NEUTRAL_COLOR,
    nodeRing: NEUTRAL_COLOR,
    nodeGap: "#0b0c10",
    intra: INTRA_HEMISPHERE_COLOR,
    inter: INTER_HEMISPHERE_COLOR,
    hemiFill: "none",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#1d1e26",
    cortexSulcus: gray(0.35),
    cortexGyrus: gray(0.72),
    cortexMedialWall: gray(0.25),
    cortexNoData: gray(0.55),
  },
  grafito: {
    edge: "#8b93a0",
    edgeOpacityConnectogram: 0.24,
    edgeOpacityHemispheres: 0.3,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.08,
    edgeOpacityHoverSelected: 0.4,
    edgeOpacitySelected: 0.95,
    dash: "3 3",
    selected: "#f1f3f6",
    hoverHighlight: "#ffd84a",
    label: "#8d95a3",
    nodeRing: "#8b93a0",
    nodeGap: "#0f1115",
    intra: "#6cc497",
    inter: "#ec8d9c",
    hemiFill: "#1d2127",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#16191e",
    cortexSulcus: hexToSrgb("#565c66"),
    cortexGyrus: hexToSrgb("#e3e5e9"),
    cortexMedialWall: hexToSrgb("#2a2e35"),
    cortexNoData: hexToSrgb("#7d838c"),
  },
  noche: {
    edge: "#8a98b6",
    edgeOpacityConnectogram: 0.26,
    edgeOpacityHemispheres: 0.3,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.08,
    edgeOpacityHoverSelected: 0.4,
    edgeOpacitySelected: 0.95,
    dash: "3 3",
    selected: "#f2f5fb",
    hoverHighlight: "#ffd84a",
    label: "#8a97b0",
    nodeRing: "#8a98b6",
    nodeGap: "#0a0e17",
    intra: "#5fd0a0",
    inter: "#f58fa3",
    hemiFill: "#172035",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#111726",
    cortexSulcus: hexToSrgb("#4f5869"),
    cortexGyrus: hexToSrgb("#dfe4ee"),
    cortexMedialWall: hexToSrgb("#262d3b"),
    cortexNoData: hexToSrgb("#7a8396"),
  },
  claro: {
    edge: "#6f737c",
    edgeOpacityConnectogram: 0.26,
    edgeOpacityHemispheres: 0.3,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.08,
    edgeOpacityHoverSelected: 0.4,
    edgeOpacitySelected: 0.95,
    dash: "3 3",
    selected: "#16181c",
    hoverHighlight: "#b7791f",
    label: "#686c74",
    nodeRing: "#6f737c",
    nodeGap: "#ffffff",
    intra: "#2e8a5a",
    inter: "#c24a5f",
    hemiFill: "#f6f5f1",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#ffffff",
    cortexSulcus: hexToSrgb("#6f7680"),
    cortexGyrus: hexToSrgb("#dcdfe4"),
    cortexMedialWall: hexToSrgb("#a3a8b0"),
    cortexNoData: hexToSrgb("#b9bdc4"),
  },
};

// Colores de dibujo de la exportación JPEG, siempre sobre blanco (decisión
// 11). Con el tema 1 salen los mismos de hoy; con los demás, los de Claro.
export function exportDrawTokens(theme: ThemeId): DrawTokens {
  return theme === "original" ? DRAW_TOKENS.original : DRAW_TOKENS.claro;
}
```

- [ ] **Step 4: implementar `frontend/src/theme/colors.ts`**

```ts
// Resolución de colores (docs/rediseno-interfaz-diseno.md, 4.3 y 4.4).
// Funciones puras: se prueban sin DOM.
import { NETWORK_COLORS } from "./networks";
import { exportDrawTokens, type DrawTokens, type ThemeId } from "./themes";

const UNCLASSIFIED = "unclassified";

// Color de una red en pantalla. En la fase 1 es siempre el original del
// atlas (NETWORK_COLORS); la paleta suave llega en la fase 2. Una clave
// desconocida usa el gris de «sin clasificar». Antes cada componente tenía
// su propio respaldo ("#888" o NEUTRAL_COLOR).
export function resolveNetworkColor(key: string): string {
  return Object.hasOwn(NETWORK_COLORS, key) ? NETWORK_COLORS[key] : NETWORK_COLORS[UNCLASSIFIED];
}

// Valor de exportación de una referencia `data-ng-*`: un token de
// DrawTokens (color u opacidad) o `net:<clave de red>`. null si la
// referencia no existe o no es un valor que se pueda escribir en un
// atributo SVG (los grises de la corteza son tripletes).
export function exportColorFor(ref: string, theme: ThemeId): string | null {
  if (ref.startsWith("net:")) return resolveNetworkColor(ref.slice("net:".length));
  const tokens = exportDrawTokens(theme);
  if (!Object.hasOwn(tokens, ref)) return null;
  const value = tokens[ref as keyof DrawTokens];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export function exportResolverFor(theme: ThemeId): (ref: string) => string | null {
  return (ref) => exportColorFor(ref, theme);
}
```

- [ ] **Step 5: comprobar que pasan**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/themes.test.ts src/theme/colors.test.ts && npx tsc -b`
Expected: PASS (13 pruebas) y `tsc` sin errores.

- [ ] **Step 6: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/theme/themes.ts frontend/src/theme/colors.ts frontend/src/theme/themes.test.ts frontend/src/theme/colors.test.ts
git commit -m "Temas: tokens de dibujo por tema y resolucion de colores (fase 1)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

**Cambios tras la revisión de calidad (ya en el repositorio, commit posterior al de la Task 1):**

- `THEME_IDS` pasa a ser `as const` y `ThemeId` se deriva de él. `THEME_INFO` y `DRAW_TOKENS` son de solo lectura en sus tipos.
- `hexToSrgb` valida la entrada y lanza un error si no recibe `#rrggbb`.
- Tipos nuevos: `PaintToken` (tokens de color, sin `dash`) y `OpacityToken` (tokens de opacidad). En `colors.ts`: `PaintRef` (un `PaintToken` o `` `net:${string}` ``) y `ExportAttributeKind` (`"paint" | "opacity"`).
- `exportColorFor(ref, kind, theme)` recibe el tipo de atributo. Devuelve null si no encaja: por ejemplo, una opacidad usada como relleno, `dash` o una clave del prototipo.
- `exportResolverFor(theme)` devuelve `(ref, kind) => string | null`.
- `hasNetworkColor(key)`, con `Object.hasOwn`.
- `ngFill(ref)`, `ngStroke(ref)` y `ngStrokeOpacity(ref)` escriben los atributos `data-ng-*` con tipo: una errata en una referencia es un error de compilación. Las Tasks 5 y 7 los usan.
- Las pruebas del tema 1 comparan con literales (`"#837f90"`, `"#ac61d1"`...), no con las constantes de las que salen.
- En la Task 3 desapareció `THEME_INFO.preview`: la vista previa de Ajustes usa las variables CSS del propio tema con `data-theme-preview`. Así no hay colores de interfaz repetidos en TypeScript.

### Task 2: store de apariencia y tema antes del primer render

**Files:**
- Create: `frontend/src/state/appearance.ts`
- Test: `frontend/src/state/appearance.test.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: escribir la prueba que falla**

`frontend/src/state/appearance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  readAppearance,
  useAppearanceStore,
  writeAppearance,
  type StorageLike,
} from "./appearance";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error("sin acceso");
  },
  setItem: () => {
    throw new Error("sin acceso");
  },
};

describe("readAppearance", () => {
  it("sin almacenamiento o sin valor guardado, Grafito y paleta automática", () => {
    expect(readAppearance(null)).toEqual({ theme: "grafito", paletteMode: null });
    expect(readAppearance(memoryStorage())).toEqual({ theme: "grafito", paletteMode: null });
  });

  it("lee lo guardado", () => {
    const storage = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"claro","paletteMode":"original"}' });
    expect(readAppearance(storage)).toEqual({ theme: "claro", paletteMode: "original" });
  });

  it("descarta valores inválidos campo a campo", () => {
    const storage = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"azul","paletteMode":"suave"}' });
    expect(readAppearance(storage)).toEqual({ theme: "grafito", paletteMode: "suave" });
  });

  it("un JSON roto o un almacenamiento que falla no rompen nada", () => {
    expect(readAppearance(memoryStorage({ [APPEARANCE_STORAGE_KEY]: "{no es json" }))).toEqual({
      theme: "grafito",
      paletteMode: null,
    });
    expect(readAppearance(brokenStorage)).toEqual({ theme: "grafito", paletteMode: null });
  });
});

describe("writeAppearance", () => {
  it("guarda y se puede volver a leer", () => {
    const storage = memoryStorage();
    writeAppearance(storage, { theme: "noche", paletteMode: null });
    expect(readAppearance(storage)).toEqual({ theme: "noche", paletteMode: null });
  });

  it("no lanza si el almacenamiento falla", () => {
    expect(() => writeAppearance(brokenStorage, { theme: "noche", paletteMode: null })).not.toThrow();
  });
});

// En node no hay window ni document: el store no guarda nada ni toca el
// documento, así que se puede probar sin efectos secundarios.
describe("useAppearanceStore", () => {
  it("cambiar de tema conserva el modo de paleta elegido (spec 4.5)", () => {
    useAppearanceStore.setState({ theme: "grafito", paletteMode: "original" });
    useAppearanceStore.getState().setTheme("claro");
    expect(useAppearanceStore.getState()).toMatchObject({ theme: "claro", paletteMode: "original" });
  });
});
```

- [ ] **Step 2: comprobar que falla**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/state/appearance.test.ts`
Expected: FAIL, porque no existe `./appearance`.

- [ ] **Step 3: implementar `frontend/src/state/appearance.ts`**

```ts
// Tema elegido y modo de la paleta de redes (decisión 77;
// docs/rediseno-interfaz-diseno.md, 4.5). paletteMode null = automático:
// "original" con el tema 1 y "suave" con los demás. La paleta suave llega
// en la fase 2, pero el formato guardado ya la incluye para no tener que
// migrarlo después.
import { create } from "zustand";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../theme/themes";

export type PaletteMode = "suave" | "original";

export interface Appearance {
  theme: ThemeId;
  paletteMode: PaletteMode | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const APPEARANCE_STORAGE_KEY = "neurograph.apariencia";
const DEFAULT_APPEARANCE: Appearance = { theme: DEFAULT_THEME, paletteMode: null };

export function readAppearance(storage: StorageLike | null): Appearance {
  if (!storage) return DEFAULT_APPEARANCE;
  try {
    const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_APPEARANCE;
    const { theme, paletteMode } = parsed as Record<string, unknown>;
    return {
      theme: isThemeId(theme) ? theme : DEFAULT_THEME,
      paletteMode: paletteMode === "suave" || paletteMode === "original" ? paletteMode : null,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(storage: StorageLike | null, value: Appearance): void {
  if (!storage) return;
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): la elección dura
    // solo esta sesión.
  }
}

export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// index.css define los colores de interfaz para cada data-theme.
export function applyThemeToDocument(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

interface AppearanceState extends Appearance {
  setTheme: (theme: ThemeId) => void;
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  ...readAppearance(browserStorage()),
  setTheme: (theme) => {
    set({ theme });
    writeAppearance(browserStorage(), { theme, paletteMode: get().paletteMode });
    applyThemeToDocument(theme);
  },
}));
```

- [ ] **Step 4: aplicar el tema antes del primer render en `frontend/src/main.tsx`**

Añade el import y la llamada entre `import App from './App.tsx'` y `createRoot(...)`. El archivo queda así:

```ts
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
```

- [ ] **Step 5: comprobar que pasa y que los tipos compilan**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/state/appearance.test.ts && npx tsc -b`
Expected: PASS (7 pruebas) y `tsc` sin errores.

- [ ] **Step 6: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/state/appearance.ts frontend/src/state/appearance.test.ts frontend/src/main.tsx
git commit -m "Temas: store de apariencia con persistencia y tema antes del primer render

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: tipografía, CSS y exportación

### Task 3: tipografía local y colores de interfaz por tema

**Files:**
- Create: `frontend/src/assets/fonts/` (4 archivos `woff2` y 2 licencias)
- Modify: `frontend/src/index.css` (bloque `:root` inicial)
- Modify: `frontend/src/App.css` (colores fijos)

- [ ] **Step 1: descargar las fuentes y sus licencias**

Desde la raíz del worktree:

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz
mkdir -p frontend/src/assets/fonts frontend/public/licenses && cd frontend/src/assets/fonts
curl -sfLo atkinson-hyperlegible-next-latin.woff2 https://fonts.gstatic.com/s/atkinsonhyperlegiblenext/v7/NaPNcYPdHfdVxJw0IfIP0lvYFqijb-UxCtm5_wdGseiJn3o.woff2
curl -sfLo atkinson-hyperlegible-next-latin-ext.woff2 https://fonts.gstatic.com/s/atkinsonhyperlegiblenext/v7/NaPNcYPdHfdVxJw0IfIP0lvYFqijb-UxCtm5_wdGseiHn3qmpQ.woff2
curl -sfLo atkinson-hyperlegible-mono-latin.woff2 https://fonts.gstatic.com/s/atkinsonhyperlegiblemono/v8/tss4AoFBci4C4gvhPXrt3wjT1MqSzhA4t7IIcncBiwKthFw.woff2
curl -sfLo atkinson-hyperlegible-mono-latin-ext.woff2 https://fonts.gstatic.com/s/atkinsonhyperlegiblemono/v8/tss4AoFBci4C4gvhPXrt3wjT1MqSzhA4t7IIcncBiwKjhFyRHQ.woff2
curl -sfLo ../../../public/licenses/OFL-AtkinsonHyperlegibleNext.txt https://raw.githubusercontent.com/google/fonts/main/ofl/atkinsonhyperlegiblenext/OFL.txt
curl -sfLo ../../../public/licenses/OFL-AtkinsonHyperlegibleMono.txt https://raw.githubusercontent.com/google/fonts/main/ofl/atkinsonhyperlegiblemono/OFL.txt
file *.woff2 && head -3 ../../../public/licenses/OFL-*.txt && ls -la . ../../../public/licenses
```

Las licencias van a `frontend/public/licenses/` y no junto a las fuentes. Así Vite las copia a `dist`, y viajan con la aplicación empaquetada, como pide la OFL al redistribuir las fuentes.

Expected:
- `file` dice «Web Open Font Format (Version 2)» para los cuatro archivos.
- Las dos licencias empiezan con una línea de copyright y hablan de la SIL Open Font License.
- Cada `woff2` pesa más de 10 KB.

Si una URL devuelve error, no inventes otra: vuelve a pedir la CSS a Google Fonts con un navegador moderno como User-Agent y usa las URL de los bloques `/* latin */` y `/* latin-ext */`:

```bash
curl -s -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@200..800&display=swap"
```

La fuente Mono se pide igual.

- [ ] **Step 2: sustituir el bloque `:root` inicial de `frontend/src/index.css`**

Borra desde la primera línea del archivo (`:root {`) hasta la llave `}` que cierra ese bloque, justo antes de `#root {`. En su lugar va este texto. El resto del archivo (`#root`, `body`, `h1`, `h2`, `p` y `code`) no cambia.

```css
/* Tipografía (decisión 77; docs/rediseno-interfaz-diseno.md, sección 7):
   Atkinson Hyperlegible Next y Mono, instaladas con la aplicación para que
   la versión de escritorio funcione sin conexión (licencia SIL OFL 1.1, ver
   public/licenses/OFL-*.txt). Son fuentes variables: un archivo por
   subconjunto cubre todos los pesos. */
@font-face {
  font-family: 'Atkinson Hyperlegible Next';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./assets/fonts/atkinson-hyperlegible-next-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Atkinson Hyperlegible Next';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./assets/fonts/atkinson-hyperlegible-next-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Atkinson Hyperlegible Mono';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./assets/fonts/atkinson-hyperlegible-mono-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Atkinson Hyperlegible Mono';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('./assets/fonts/atkinson-hyperlegible-mono-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Temas (decisiones 18 y 77; docs/rediseno-interfaz-diseno.md, 4.1).
   main.tsx pone data-theme en <html> antes del primer render; sin él se
   usa el tema 1. Todos los bloques definen las mismas variables. Los
   mismos bloques se aplican a cualquier elemento con
   data-theme-preview="<id>": así la vista previa de Ajustes muestra los
   colores reales de cada tema sin repetirlos en TypeScript.
   Equivalencias con los nombres del spec:
     --code-bg = raised, --text-h = strong, --text-muted = muted,
     --text-faint = faint, --accent-bg = accentSoft,
     --accent-border = accentBorder.
   Cada color de estado (--success, --warning, --error, --synthesis) tiene
   su fondo translúcido --*-bg. Los colores que se dibujan dentro de los
   SVG y del 3D no están aquí: están en theme/themes.ts (DRAW_TOKENS). */
:root,
:root[data-theme="original"],
[data-theme-preview="original"] {
  --bg: #15161c;
  --panel-bg: #1d1e26;
  --code-bg: #23242c;
  --hover: #2a2b34;
  --border: #34343e;
  --border-strong: #46465a;
  --text: #c7c5d0;
  --text-h: #f3f2f7;
  --text-muted: #9995a8;
  --text-faint: #6f6c7d;
  --accent: #ac61d1;
  --accent-bg: rgba(172, 97, 209, 0.15);
  --accent-border: rgba(172, 97, 209, 0.5);
  --success: #7fe0a0;
  --success-bg: rgba(127, 224, 160, 0.16);
  --warning: #f0c473;
  --warning-bg: rgba(240, 196, 115, 0.16);
  --error: #ff9b9b;
  --error-bg: rgba(255, 90, 90, 0.12);
  --synthesis: #ff7b3d;
  --synthesis-bg: rgba(255, 123, 61, 0.18);
  --shadow:
    rgba(0, 0, 0, 0.45) 0 10px 15px -3px, rgba(0, 0, 0, 0.3) 0 4px 6px -2px;
  color-scheme: dark;
}

:root[data-theme="grafito"],
[data-theme-preview="grafito"] {
  --bg: #0f1115;
  --panel-bg: #16191e;
  --code-bg: #1d2127;
  --hover: #232830;
  --border: #262b33;
  --border-strong: #363c47;
  --text: #c9ced6;
  --text-h: #f1f3f6;
  --text-muted: #8d95a3;
  --text-faint: #5f6775;
  --accent: #e8ecf1;
  --accent-bg: rgba(232, 236, 241, 0.08);
  --accent-border: rgba(232, 236, 241, 0.35);
  --success: #6cc497;
  --success-bg: rgba(108, 196, 151, 0.14);
  --warning: #e7c46a;
  --warning-bg: rgba(231, 196, 106, 0.14);
  --error: #f09a9a;
  --error-bg: rgba(240, 154, 154, 0.12);
  --synthesis: #ff7b3d;
  --synthesis-bg: rgba(255, 123, 61, 0.16);
  --shadow:
    rgba(0, 0, 0, 0.55) 0 10px 15px -3px, rgba(0, 0, 0, 0.35) 0 4px 6px -2px;
  color-scheme: dark;
}

:root[data-theme="noche"],
[data-theme-preview="noche"] {
  --bg: #0a0e17;
  --panel-bg: #111726;
  --code-bg: #172035;
  --hover: #1c2640;
  --border: #1f2940;
  --border-strong: #2e3b58;
  --text: #cbd5e6;
  --text-h: #f2f5fb;
  --text-muted: #8a97b0;
  --text-faint: #5b6782;
  --accent: #e3ebfb;
  --accent-bg: rgba(227, 235, 251, 0.08);
  --accent-border: rgba(227, 235, 251, 0.35);
  --success: #5fd0a0;
  --success-bg: rgba(95, 208, 160, 0.14);
  --warning: #edc766;
  --warning-bg: rgba(237, 199, 102, 0.14);
  --error: #f59c9c;
  --error-bg: rgba(245, 156, 156, 0.12);
  --synthesis: #ff7b3d;
  --synthesis-bg: rgba(255, 123, 61, 0.16);
  --shadow:
    rgba(0, 0, 0, 0.6) 0 10px 15px -3px, rgba(0, 0, 0, 0.4) 0 4px 6px -2px;
  color-scheme: dark;
}

:root[data-theme="claro"],
[data-theme-preview="claro"] {
  --bg: #f3f2ee;
  --panel-bg: #ffffff;
  --code-bg: #f6f5f1;
  --hover: #eeede8;
  --border: #e2e0d9;
  --border-strong: #cfccc3;
  --text: #3a3d43;
  --text-h: #14161a;
  --text-muted: #686c74;
  --text-faint: #9a9da4;
  --accent: #16181c;
  --accent-bg: rgba(22, 24, 28, 0.06);
  --accent-border: rgba(22, 24, 28, 0.35);
  --success: #227a4d;
  --success-bg: rgba(34, 122, 77, 0.1);
  --warning: #7a5d00;
  --warning-bg: rgba(122, 93, 0, 0.1);
  --error: #b42318;
  --error-bg: rgba(180, 35, 24, 0.08);
  --synthesis: #b93d0a;
  --synthesis-bg: rgba(185, 61, 10, 0.1);
  --shadow:
    rgba(40, 36, 20, 0.12) 0 10px 15px -3px, rgba(40, 36, 20, 0.08) 0 4px 6px -2px;
  color-scheme: light;
}

:root {
  --sans: 'Atkinson Hyperlegible Next', system-ui, 'Segoe UI', Roboto, sans-serif;
  --heading: var(--sans);
  --mono: 'Atkinson Hyperlegible Mono', ui-monospace, Consolas, monospace;

  font: 18px/145% var(--sans);
  letter-spacing: 0.18px;
  color: var(--text);
  background: var(--bg);
  /* Casillas, deslizadores y demás controles nativos con el acento del
     tema, no con el color por defecto del navegador. */
  accent-color: var(--accent);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  @media (max-width: 1024px) {
    font-size: 16px;
  }
}

/* Los controles de formulario no heredan la fuente por defecto: sin esto,
   botones, desplegables y campos seguirían con la del sistema. Solo la
   familia, para no cambiar ningún tamaño. */
button,
input,
select,
textarea {
  font-family: inherit;
}
```

La variable `--social-bg` desaparece porque no la usa ningún archivo. Compruébalo:

```bash
grep -rn "social-bg" ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src
```

Expected: sin resultados.

- [ ] **Step 3: pasar a variables los colores fijos de `frontend/src/App.css`**

Desde la raíz del worktree:

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src
sed -i 's/^\.app { font-family: system-ui, sans-serif;/.app { font-family: var(--sans);/' App.css
sed -i 's/background: rgba(240, 196, 115, 0.16); color: #f0c473;/background: var(--warning-bg); color: var(--warning);/' App.css
sed -i 's/background: rgba(127, 224, 160, 0.16); color: #7fe0a0;/background: var(--success-bg); color: var(--success);/' App.css
sed -i 's/color: #ff9b9b; background: rgba(255, 90, 90, 0.12);/color: var(--error); background: var(--error-bg);/g' App.css
sed -i 's/background: rgba(255, 90, 90, 0.12); color: #ff9b9b;/background: var(--error-bg); color: var(--error);/' App.css
sed -i 's/background: rgba(255, 123, 61, 0.18); color: #ff7b3d;/background: var(--synthesis-bg); color: var(--synthesis);/' App.css
sed -i 's/border-left: 3px solid #ff7b3d;/border-left: 3px solid var(--synthesis);/' App.css
sed -i 's/\(\.synthesis-finding__agrees {[^}]*\)color: #7fe0a0;/\1color: var(--success);/' App.css
sed -i 's/color: #ff9b9b;/color: var(--error);/g' App.css
grep -n "#[0-9a-fA-F]\{3,8\}\|rgba\?(" App.css
```

Expected: el último `grep` solo muestra la línea de `.species-panel__figure img { ... background: #ffffff; }`.

Esa se queda como está, con este comentario encima:

```css
/* Blanco fijo a propósito: las imágenes de GET /render/species/* vienen
   dibujadas sobre blanco, en cualquier tema. */
```

Hay que actualizar también el comentario de las líneas 2 a 6 de `App.css`, que empieza por `/* Tema oscuro (30/08/2026, decisión 18): los badges nunca se exportan`. Dice que basta con que las etiquetas se vean sobre fondo oscuro, y con el tema Claro deja de ser cierto. Sustitúyelo entero, hasta su `*/`, por:

```css
/* Etiquetas de datos reales y de demostración (decisiones 18 y 77): nunca
   se exportan. Sus colores (--success y --warning, con sus fondos -bg) los
   define cada tema en index.css. */
```

- [ ] **Step 4: quitar `preview` de `THEME_INFO`**

Con los selectores `[data-theme-preview="<id>"]`, la vista previa de Ajustes (Task 8) toma los colores de `index.css`. En `frontend/src/theme/themes.ts`, quita el campo `preview` de la interfaz `ThemeInfo` (con su comentario) y de las cuatro entradas de `THEME_INFO`. Quedan `number`, `name` y `description`. Nada más usa `preview` todavía: compruébalo con `grep -rn "preview" frontend/src`.

Por qué no hay una prueba que compare el CSS con TypeScript: vitest vacía cualquier import `….css?raw` (su CSSEnablerPlugin lo convierte en `export default ""`). Leerlo con `node:fs` exigiría los tipos de node en `tsconfig.app.json`. Sin duplicación, no hace falta la prueba.

- [ ] **Step 5: comprobar que compila**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm run build`
Expected: `✓ built`. El aviso de tamaño de bloque (más de 500 kB) ya estaba. `dist/licenses/` contiene las dos licencias.

- [ ] **Step 6: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/assets/fonts frontend/public/licenses frontend/src/index.css frontend/src/App.css frontend/src/theme/themes.ts
git commit -m "Temas: tipografia Atkinson Hyperlegible local y colores de interfaz por tema

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 4: exportación SVG con la paleta de exportación

**Files:**
- Create: `frontend/src/logic/exportPalette.ts`
- Test: `frontend/src/logic/exportPalette.test.ts`
- Modify: `frontend/src/logic/exportImage.ts` (función `exportSvgAsJpeg`)

- [ ] **Step 1: escribir la prueba que falla**

La prueba usa elementos simulados, porque vitest corre sin DOM.

`frontend/src/logic/exportPalette.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyExportColors, type ExportableElement } from "./exportPalette";

class FakeElement implements ExportableElement {
  attributes: Record<string, string>;
  children: FakeElement[];
  constructor(attributes: Record<string, string>, children: FakeElement[] = []) {
    this.attributes = { ...attributes };
    this.children = children;
  }
  getAttribute(name: string): string | null {
    return name in this.attributes ? this.attributes[name] : null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }
  // Solo entiende selectores de la forma "[atributo]", los que usa exportPalette.
  querySelectorAll(selector: string): FakeElement[] {
    const name = selector.slice(1, -1);
    const found: FakeElement[] = [];
    const walk = (el: FakeElement) => {
      for (const child of el.children) {
        if (name in child.attributes) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

const resolve = (ref: string) =>
  ({ edge: "#6f737c", "net:cole-anticevic.visual": "#0000ff", edgeOpacityConnectogram: "0.26" })[ref] ?? null;

function recordingResolver() {
  const calls: [string, string][] = [];
  const resolveAndRecord = (ref: string, kind: string) => {
    calls.push([ref, kind]);
    return resolve(ref);
  };
  return { calls, resolve: resolveAndRecord };
}

describe("applyExportColors", () => {
  it("reescribe fill, stroke y stroke-opacity según las referencias", () => {
    const node = new FakeElement({ fill: "#aaaaaa", "data-ng-fill": "net:cole-anticevic.visual" });
    const line = new FakeElement({
      stroke: "#8b93a0",
      "data-ng-stroke": "edge",
      "stroke-opacity": "0.24",
      "data-ng-stroke-opacity": "edgeOpacityConnectogram",
    });
    const root = new FakeElement({}, [new FakeElement({}, [node]), line]);
    applyExportColors(root, resolve);
    expect(node.attributes.fill).toBe("#0000ff");
    expect(line.attributes.stroke).toBe("#6f737c");
    expect(line.attributes["stroke-opacity"]).toBe("0.26");
  });

  it("deja el atributo como estaba si la referencia no se resuelve, y lo avisa", () => {
    const el = new FakeElement({ fill: "#123456", "data-ng-fill": "desconocida" });
    const unresolved: [string, string][] = [];
    applyExportColors(new FakeElement({}, [el]), resolve, (ref, attribute) => unresolved.push([ref, attribute]));
    expect(el.attributes.fill).toBe("#123456");
    expect(unresolved).toEqual([["desconocida", "data-ng-fill"]]);
  });

  it("pide color para fill y stroke, y opacidad para stroke-opacity", () => {
    const line = new FakeElement({ "data-ng-stroke": "edge", "data-ng-stroke-opacity": "edgeOpacityConnectogram" });
    const node = new FakeElement({ "data-ng-fill": "net:cole-anticevic.visual" });
    const recorder = recordingResolver();
    applyExportColors(new FakeElement({}, [line, node]), recorder.resolve);
    expect(recorder.calls).toEqual(
      expect.arrayContaining([
        ["net:cole-anticevic.visual", "paint"],
        ["edge", "paint"],
        ["edgeOpacityConnectogram", "opacity"],
      ]),
    );
  });

  it("también trata la propia raíz", () => {
    const root = new FakeElement({ fill: "#000000", "data-ng-fill": "edge" });
    applyExportColors(root, resolve);
    expect(root.attributes.fill).toBe("#6f737c");
  });
});
```

- [ ] **Step 2: comprobar que falla**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/exportPalette.test.ts`
Expected: FAIL, porque no existe `./exportPalette`.

- [ ] **Step 3: implementar `frontend/src/logic/exportPalette.ts`**

```ts
// Colores de la exportación JPEG (decisión 77; docs/rediseno-interfaz-diseno.md, 4.4).
// exportSvgAsJpeg clona el SVG tal como se ve en pantalla. Con temas, el
// clon llevaría los colores del tema de pantalla, que sobre el blanco de
// la exportación pueden no leerse. Cada elemento con color de tema lleva
// data-ng-fill / data-ng-stroke / data-ng-stroke-opacity con una
// referencia (un token de DrawTokens o "net:<clave>"). Aquí se sustituye
// su valor por el de la paleta de exportación antes de serializar.
import type { ExportAttributeKind } from "../theme/colors";

export interface ExportableElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  querySelectorAll(selector: string): ArrayLike<ExportableElement>;
}

// Recibe la referencia y el tipo de atributo: un color para fill/stroke, una
// opacidad para stroke-opacity. exportResolverFor (theme/colors.ts) cumple
// esta firma.
export type ColorResolver = (ref: string, kind: ExportAttributeKind) => string | null;

const MAPPINGS: readonly (readonly [dataAttribute: string, target: string, kind: ExportAttributeKind])[] = [
  ["data-ng-fill", "fill", "paint"],
  ["data-ng-stroke", "stroke", "paint"],
  ["data-ng-stroke-opacity", "stroke-opacity", "opacity"],
];

// onUnresolved: se llama con cada referencia sin valor de exportación. El
// atributo se queda como estaba, con el color de pantalla.
export function applyExportColors(
  root: ExportableElement,
  resolve: ColorResolver,
  onUnresolved?: (ref: string, dataAttribute: string) => void,
): void {
  for (const [dataAttribute, target, kind] of MAPPINGS) {
    const elements = [root, ...Array.from(root.querySelectorAll(`[${dataAttribute}]`))];
    for (const element of elements) {
      const ref = element.getAttribute(dataAttribute);
      if (ref === null) continue;
      const value = resolve(ref, kind);
      if (value !== null) element.setAttribute(target, value);
      else onUnresolved?.(ref, dataAttribute);
    }
  }
}

// Fuente explícita del SVG exportado: el SVG serializado no carga la fuente
// de la aplicación, y sin esto el navegador usaría su fuente por defecto.
export const EXPORT_FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
```

- [ ] **Step 4: usarlo en `exportSvgAsJpeg` (`frontend/src/logic/exportImage.ts`)**

El archivo no tiene imports todavía. Añade este justo antes de `const JPEG_QUALITY = 0.95;`, debajo del comentario de cabecera:

```ts
import { applyExportColors, EXPORT_FONT_FAMILY, type ColorResolver } from "./exportPalette";
```

Cambia la firma:

```ts
export function exportSvgAsJpeg(svg: SVGSVGElement, filename: string): void {
```

por:

```ts
export function exportSvgAsJpeg(svg: SVGSVGElement, filename: string, resolveColor?: ColorResolver): void {
```

Justo después de las dos líneas `clone.setAttribute("width", ...)` y `clone.setAttribute("height", ...)` añade:

```ts
  // Paleta de exportación (decisión 77): colores legibles sobre el blanco
  // de la exportación, sea cual sea el tema de pantalla. En desarrollo se
  // avisa de cada referencia sin color de exportación: quedaría con el
  // color de pantalla.
  if (resolveColor) {
    applyExportColors(clone, resolveColor, (ref, attribute) => {
      if (import.meta.env.DEV) console.warn(`Exportación: ${attribute}="${ref}" no tiene color de exportación.`);
    });
  }
  clone.setAttribute("font-family", EXPORT_FONT_FAMILY);
```

El parámetro es opcional: los llamadores actuales siguen compilando, y la Task 5 les pasa el resolvedor.

- [ ] **Step 5: comprobar que pasa**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/exportPalette.test.ts && npx tsc -b`
Expected: PASS (4 pruebas) y `tsc` sin errores.

- [ ] **Step 6: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/exportPalette.ts frontend/src/logic/exportPalette.test.ts frontend/src/logic/exportImage.ts
git commit -m "Temas: paleta de exportacion para los SVG exportados

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: dibujo 2D con tokens

### Task 5: hook `useDrawColors` y los cinco componentes 2D

**Files:**
- Create: `frontend/src/theme/useDrawColors.ts`
- Modify: `frontend/src/theme/colors.test.ts` (prueba de `drawColorsFor`)
- Modify: `frontend/src/components/Connectogram.tsx`, `Hemisferios.tsx`, `DetailPanel.tsx`, `FilterPanel.tsx` y `FunctionSynthesisTab.tsx`

Regla para esta tarea: todo color de los SVG exportables (connectograma, hemisferios y leyenda de `DetailPanel`) lleva su atributo `data-ng-*`. Los colores de lo que no se exporta (lupa, resaltado al pasar el ratón, diagrama de síntesis y muestras de `FilterPanel`) no lo necesitan.

Los atributos `data-ng-*` se escriben siempre con los ayudantes tipados de `theme/colors.ts`: `{...ngFill("edge")}`, `{...ngStroke(...)}` y `{...ngStrokeOpacity(...)}`. Nunca se escribe el atributo `data-ng-fill` (ni los otros dos) a mano: con los ayudantes, una referencia mal escrita es un error de compilación. Importa en cada componente solo los que use.

- [ ] **Step 1: prueba de `drawColorsFor` (falla)**

Añade al final de `frontend/src/theme/colors.test.ts`:

```ts
import { drawColorsFor } from "./useDrawColors";

describe("drawColorsFor", () => {
  it("devuelve los tokens del tema y el resolvedor de redes", () => {
    const colors = drawColorsFor("noche");
    expect(colors.edge).toBe(DRAW_TOKENS.noche.edge);
    expect(colors.networkColor("cole-anticevic.visual")).toBe("#0000ff");
  });

  it("forExport devuelve los tokens de exportación", () => {
    expect(drawColorsFor("grafito", true).selected).toBe(DRAW_TOKENS.claro.selected);
    expect(drawColorsFor("original", true).selected).toBe(DRAW_TOKENS.original.selected);
  });
});
```

Deja el `import` junto a los demás imports, al principio del archivo.

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/colors.test.ts`
Expected: FAIL, porque no existe `./useDrawColors`.

- [ ] **Step 2: implementar `frontend/src/theme/useDrawColors.ts`**

```ts
// Colores de dibujo (SVG y 3D) del tema activo (decisión 77). forExport:
// los de la exportación (docs/rediseno-interfaz-diseno.md, 4.4). Solo lo
// usa Brain3D, con su estado local «exportando».
import { useMemo } from "react";
import { useAppearanceStore } from "../state/appearance";
import { resolveNetworkColor } from "./colors";
import { DRAW_TOKENS, exportDrawTokens, type DrawTokens, type ThemeId } from "./themes";

export interface DrawColors extends DrawTokens {
  networkColor: (key: string) => string;
}

export function drawColorsFor(theme: ThemeId, forExport = false): DrawColors {
  const tokens = forExport ? exportDrawTokens(theme) : DRAW_TOKENS[theme];
  return { ...tokens, networkColor: resolveNetworkColor };
}

export function useDrawColors(forExport = false): DrawColors {
  const theme = useAppearanceStore((state) => state.theme);
  return useMemo(() => drawColorsFor(theme, forExport), [theme, forExport]);
}
```

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/colors.test.ts`
Expected: PASS.

- [ ] **Step 3: `Connectogram.tsx`**

1. **Imports.** Sustituye el bloque `import { NETWORK_COLORS, CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS, NEUTRAL_COLOR, ACCENT_SELECTED_COLOR, HOVER_HIGHLIGHT_COLOR } from "../theme/networks";`, repartido en varias líneas, por:

   ```ts
   import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";
   import { exportResolverFor, ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
   import { useDrawColors, type DrawColors } from "../theme/useDrawColors";
   import { useAppearanceStore } from "../state/appearance";
   ```

2. **Hook.** Justo después de `const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);`, en `Connectogram`, añade:

   ```ts
   const colors = useDrawColors();
   ```

3. **Exportar.** En `handleExport`, la llamada pasa a ser:

   ```ts
   exportSvgAsJpeg(
     svgRef.current,
     `neurograph-connectograma-${Date.now()}.jpg`,
     exportResolverFor(useAppearanceStore.getState().theme),
   );
   ```

4. **Marcadores de `<defs>`.** En los tres `<path d="M 0 0 L 10 5 L 0 10 z" .../>`:
   - `fill={NEUTRAL_COLOR}` → `fill={colors.edge} {...ngFill("edge")}`
   - `fill={ACCENT_SELECTED_COLOR}` → `fill={colors.selected} {...ngFill("selected")}`
   - `fill={HOVER_HIGHLIGHT_COLOR}` → `fill={colors.hoverHighlight} {...ngFill("hoverHighlight")}`

5. **Conexiones** (el `<path key={conn.id}` dentro de `visibleConnections.map`). Sustituye todo el tramo desde `stroke={isSelected ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR}` hasta `strokeDasharray={isDashed ? "6 4" : undefined}`, los dos incluidos, por el bloque de abajo. En medio están `strokeOpacity` y `strokeWidth`, y el bloque nuevo ya incluye `strokeWidth`: no lo dupliques.

   ```tsx
   stroke={isSelected ? colors.selected : colors.edge}
   {...ngStroke(isSelected ? "selected" : "edge")}
   strokeOpacity={
     hoveredNodeId !== null
       ? isSelected
         ? colors.edgeOpacityHoverSelected
         : colors.edgeOpacityHoverOther
       : isSelected
         ? colors.edgeOpacitySelected
         : colors.edgeOpacityConnectogram
   }
   {...ngStrokeOpacity(isSelected ? "edgeOpacitySelected" : "edgeOpacityConnectogram")}
   strokeWidth={Math.max(1, conn.weight * 6)}
   strokeDasharray={isDashed ? colors.dash : undefined}
   ```

6. **Conexiones resaltadas** (dentro de `hoveredConnections.map`):
   - `stroke={HOVER_HIGHLIGHT_COLOR}` → `stroke={colors.hoverHighlight}`
   - `strokeDasharray={conn.evidenceLevel !== "direct" ? "6 4" : undefined}` → `strokeDasharray={conn.evidenceLevel !== "direct" ? colors.dash : undefined}`

7. **Nodos** (el `<circle r={currentNodeRadius}`). Sustituye `fill` y `stroke` por:

   ```tsx
   fill={colors.networkColor(node.network)}
   {...ngFill(`net:${node.network}`)}
   stroke={isSelected ? colors.selected : colors.nodeRing}
   {...ngStroke(isSelected ? "selected" : "nodeRing")}
   ```

8. **Abreviaturas.** En el `<text x={labelX}`, `fill={NEUTRAL_COLOR}` → `fill={colors.label} {...ngFill("label")}`.

9. **Lupa.**
   - Añade `colors={colors}` a `<ConnectogramLens ... />`, `colors: DrawColors;` a `interface LensProps` y `colors,` a los parámetros de `ConnectogramLens`.
   - Borra `const LENS_HOVER_COLOR = HOVER_HIGHLIGHT_COLOR;`.
   - Dentro de `ConnectogramLens`:
     - Anillo: `stroke={NEUTRAL_COLOR}` → `stroke={colors.edge}`.
     - Conexiones:
       - `stroke={hovered ? LENS_HOVER_COLOR : ACCENT_SELECTED_COLOR}` → `stroke={hovered ? colors.hoverHighlight : colors.selected}`
       - `strokeOpacity={hovered ? 1 : 0.95}` → `strokeOpacity={hovered ? 1 : colors.edgeOpacitySelected}`
       - `"6 4"` → `colors.dash`
     - Nodos:
       - `fill={NETWORK_COLORS[node.network] ?? "#888"}` → `fill={colors.networkColor(node.network)}`
       - `stroke={isSelected || isHovered ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR}` → `stroke={isSelected || isHovered ? colors.selected : colors.nodeRing}`
     - Texto: `fill={isHovered ? "var(--text-h)" : NEUTRAL_COLOR}` → `fill={isHovered ? "var(--text-h)" : colors.label}`.

   La lupa solo existe mientras el ratón está encima y nunca se exporta, así que no lleva `data-ng-*`.

10. **Comentarios que quedan desfasados.**
    - En el comentario que empieza por `{/* Resaltado al pasar el ratón por un nodo (decisión 76c`, cambia `HOVER_HIGHLIGHT_COLOR` por `el color de resaltado del tema (token hoverHighlight)`.
    - En el que empieza por `{/* El relleno es SIEMPRE el color de red real`, cambia la frase `NEUTRAL_COLOR es legible sobre oscuro y sobre el blanco de la exportación por igual.` por `El contorno usa el token nodeRing del tema; al exportar, applyExportColors lo cambia por uno legible sobre blanco (decisión 77).`.

11. **Comprobación:**

    ```bash
    grep -n "NETWORK_COLORS\|NEUTRAL_COLOR\|ACCENT_SELECTED_COLOR\|HOVER_HIGHLIGHT_COLOR\|\"#888\"\|\"6 4\"" ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src/components/Connectogram.tsx
    ```

    Expected: solo aparecen en comentarios.

- [ ] **Step 4: `Hemisferios.tsx`**

1. **Imports.**
   - Quita del import de `"../theme/networks"` estos nombres: `NETWORK_COLORS`, `NEUTRAL_COLOR`, `ACCENT_SELECTED_COLOR`, `INTRA_HEMISPHERE_COLOR` e `INTER_HEMISPHERE_COLOR`. Quedan `CONNECTION_TYPE_LABELS` y `EVIDENCE_LEVEL_LABELS`.
   - Añade los mismos imports que en el connectograma: `exportResolverFor`, `ngFill`, `ngStroke` y `ngStrokeOpacity` de `"../theme/colors"`, `useDrawColors` y `useAppearanceStore`. `type DrawColors` no hace falta.
   - Borra `const INTRA_COLOR = INTRA_HEMISPHERE_COLOR;` y `const INTER_COLOR = INTER_HEMISPHERE_COLOR;`, y también el comentario que los precede, desde `// INTRA_COLOR/INTER_COLOR vivían aquí como constantes locales` hasta la línea anterior a las constantes. Pon en su lugar: `// Los colores intra- e interhemisférico son tokens del tema (intra, inter: theme/themes.ts, decisión 77).`
2. **Hook.** Al principio del componente `Hemisferios`, junto a los demás hooks, añade `const colors = useDrawColors();`.
3. **Exportar.** `handleExport` pasa `exportResolverFor(useAppearanceStore.getState().theme)` como tercer argumento de `exportSvgAsJpeg`, igual que en el connectograma.
4. **Marcadores.** En los dos marcadores de `<defs>`:
   - `fill={NEUTRAL_COLOR}` → `fill={colors.edge} {...ngFill("edge")}`
   - `fill={ACCENT_SELECTED_COLOR}` → `fill={colors.selected} {...ngFill("selected")}`
5. **Rótulos.** En los cuatro textos (ANTERIOR, POSTERIOR, IZQUIERDO y DERECHO), `fill={NEUTRAL_COLOR}` → `fill={colors.label} {...ngFill("label")}`.
6. **Línea media.** En el `<line` de la línea media, `stroke={NEUTRAL_COLOR}` → `stroke={colors.edge} {...ngStroke("edge")}`.
7. **Elipses.** En las dos elipses, `fill="none" stroke={NEUTRAL_COLOR}` → `fill={colors.hemiFill} {...ngFill("hemiFill")} stroke={colors.edge} {...ngStroke("edge")}`.

   El comentario que empieza por `{/* Elipses sin relleno (decisión 18, 30/08/2026)` queda desfasado. Añade al final, antes del `*/}`, esta frase: `Desde la decisión 77 el relleno es el token hemiFill del tema: "none" en el tema Original, como hasta ahora, y un tono apenas más claro que el panel en los demás; la exportación lo cambia por el de su paleta.`
8. **Conexiones.** Sustituye `const color = !isClassified ? NEUTRAL_COLOR : isInter ? INTER_COLOR : INTRA_COLOR;` por:

   ```ts
   const colorRef: "edge" | "inter" | "intra" = !isClassified ? "edge" : isInter ? "inter" : "intra";
   const color = colors[colorRef];
   ```

   En el `<line key={conn.id}`, sustituye todo el tramo desde `stroke={color}` hasta `strokeDasharray={isDashed ? "6 4" : undefined}`, los dos incluidos, por el bloque de abajo. En medio están `strokeOpacity` y `strokeWidth`, y el bloque ya incluye `strokeWidth`: no lo dupliques.

   ```tsx
   stroke={color}
   {...ngStroke(colorRef)}
   strokeOpacity={isSelected ? colors.edgeOpacitySelected : colors.edgeOpacityHemispheres}
   {...ngStrokeOpacity(isSelected ? "edgeOpacitySelected" : "edgeOpacityHemispheres")}
   strokeWidth={Math.max(1, conn.weight * 5) * (isSelected ? 1.4 : 1)}
   strokeDasharray={isDashed ? colors.dash : undefined}
   ```

9. **Nodos.** En el `<circle` de cada nodo, igual que en el connectograma:

   ```tsx
   fill={colors.networkColor(node.network)}
   {...ngFill(`net:${node.network}`)}
   stroke={isSelected ? colors.selected : colors.nodeRing}
   {...ngStroke(isSelected ? "selected" : "nodeRing")}
   ```

10. **Etiquetas de los nodos.** `fill={NEUTRAL_COLOR}` → `fill={colors.label} {...ngFill("label")}`.
11. **Comprobación.** Mismo `grep` del paso 3, con `Hemisferios.tsx` y añadiendo `INTRA_\|INTER_` al patrón. Expected: solo aparecen en comentarios.

- [ ] **Step 5: `DetailPanel.tsx`, `FilterPanel.tsx` y `FunctionSynthesisTab.tsx`**

`DetailPanel.tsx`:
1. **Imports.**
   - Quita `NETWORK_COLORS` y `NEUTRAL_COLOR` del import de `"../theme/networks"`; quedan `CONNECTION_TYPE_LABELS`, `EVIDENCE_LEVEL_LABELS` y `NETWORK_LABELS`.
   - Añade estos tres imports. Aquí no hace falta `type DrawColors`: si lo importas sin usarlo, `tsc` da el error TS6133.

     ```ts
     import { exportResolverFor, ngFill, ngStroke } from "../theme/colors";
     import { useDrawColors } from "../theme/useDrawColors";
     import { useAppearanceStore } from "../state/appearance";
     ```

2. **Hook.** En la función que declara `const legendSvgRef = useRef<SVGSVGElement>(null);` (cerca de la línea 161), añade justo después `const colors = useDrawColors();`.
3. **Exportar.** `handleExportLegend` pasa `exportResolverFor(useAppearanceStore.getState().theme)` como tercer argumento.
4. **Leyenda exportable.** El `<circle r={5} ...>` de la leyenda queda así:

   ```tsx
   <circle
     r={5}
     cy={-4}
     fill={colors.networkColor(node.network)}
     {...ngFill(`net:${node.network}`)}
     stroke={colors.nodeRing}
     {...ngStroke("nodeRing")}
     strokeWidth={1}
   />
   ```

   En el `<text x={14}`, `fill={NEUTRAL_COLOR}` → `fill={colors.label} {...ngFill("label")}`.
5. **Comentario.** En el que empieza por `{/* Mismo criterio que Connectogram.tsx/Hemisferios.tsx (decisión`, cambia la frase final `El círculo de red mantiene su color real sin tocar (NETWORK_COLORS); el texto usa NEUTRAL_COLOR, legible sobre los dos fondos.` por `El círculo usa el color de red y el texto el token label del tema; al exportar, applyExportColors los cambia por los de la paleta de exportación (decisión 77).`

`FilterPanel.tsx`:
- **Imports.** `import { CONNECTION_TYPE_LABELS, NETWORK_COLORS, NETWORK_LABELS, NEUTRAL_COLOR } from "../theme/networks";` pasa a ser:

  ```ts
  import { CONNECTION_TYPE_LABELS, NETWORK_LABELS } from "../theme/networks";
  import { resolveNetworkColor } from "../theme/colors";
  ```

- **Muestra de color.** `style={{ backgroundColor: NETWORK_COLORS[network] ?? NEUTRAL_COLOR }}` → `style={{ backgroundColor: resolveNetworkColor(network) }}`.

`FunctionSynthesisTab.tsx`:
- **Imports.** `import { NETWORK_COLORS, NETWORK_LABELS, NEUTRAL_COLOR } from "../theme/networks";` pasa a ser:

  ```ts
  import { NETWORK_LABELS } from "../theme/networks";
  import { useDrawColors } from "../theme/useDrawColors";
  ```

- **Hook.** Primera línea de `function FindingDiagram(...)`: `const colors = useDrawColors();`.
- **Colores del diagrama:**
  - `stroke={NEUTRAL_COLOR}` (líneas entre pares) → `stroke={colors.edge}`.
  - `const color = NETWORK_COLORS[node.network] ?? NEUTRAL_COLOR;` → `const color = colors.networkColor(node.network);`.
  - `stroke="#0b0c10"` → `stroke={colors.nodeGap}`.
- `NETWORK_LABELS` se sigue usando en ese archivo: compruébalo con `grep -n NETWORK_LABELS` antes de dejarlo en el import. Si ya no se usa, quítalo.

- [ ] **Step 6: comprobar**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx tsc -b && npm test && npm run lint
grep -rn "NETWORK_COLORS\|NEUTRAL_COLOR\|ACCENT_SELECTED_COLOR\|HOVER_HIGHLIGHT_COLOR\|INTRA_HEMISPHERE_COLOR\|INTER_HEMISPHERE_COLOR" src/components/Connectogram.tsx src/components/Hemisferios.tsx src/components/DetailPanel.tsx src/components/FilterPanel.tsx src/components/FunctionSynthesisTab.tsx | grep -v "//\|{/\*\|^\S*:\s*\*"
```

Expected:
- `tsc` sin errores y todas las pruebas en verde.
- `lint` sin errores y con los mismos 9 avisos previos, aunque cambien los números de línea.
- El `grep` final no devuelve nada. El filtro no reconoce los comentarios `{/* … */}` de varias líneas: si aparece alguna línea, comprueba si es uno de ellos. Si lo es, actualízalo para que hable de los tokens del tema. Si es código, es un color que se quedó sin cambiar.

- [ ] **Step 7: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/theme/useDrawColors.ts frontend/src/theme/colors.test.ts frontend/src/components/Connectogram.tsx frontend/src/components/Hemisferios.tsx frontend/src/components/DetailPanel.tsx frontend/src/components/FilterPanel.tsx frontend/src/components/FunctionSynthesisTab.tsx
git commit -m "Temas: colores de dibujo 2D desde tokens y atributos de exportacion

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 4: 3D, Ajustes y cierre

### Task 6: grises de la corteza por tema

**Files:**
- Modify: `frontend/src/logic/surfaceParcels.ts` (constantes `GRAY_*`, `fillVertexColors` y `fillVertexColorsByIndex`)
- Test: `frontend/src/logic/surfaceParcels.test.ts`

- [ ] **Step 1: escribir la prueba que falla**

Añade esta prueba al `describe("fillVertexColors", ...)` de `frontend/src/logic/surfaceParcels.test.ts`. Añade también al import de `./surfaceParcels` los nombres que aún no estén entre `fillVertexColorsByIndex`, `NO_REGION` y `type CortexGrays`. `NO_REGION` ya se importa hoy: no lo repitas.

```ts
  it("usa los grises del tema: surco, giro, pared medial y sin dato", () => {
    const grays: CortexGrays = {
      sulcus: [0.1, 0.2, 0.3],
      gyrus: [0.5, 0.6, 0.7],
      noData: [0.4, 0.4, 0.4],
      medialWall: [0.9, 0.8, 0.7],
    };
    // v0 fondo de surco, v1 corona de giro, v2 pared medial, v3 región sin dato de surco.
    const vertexIndex = new Int32Array([0, 0, NO_REGION, 0]);
    const sulc = new Float32Array([0, 1, Number.NaN, Number.NaN]);
    const out = new Float32Array(12);
    fillVertexColorsByIndex(out, vertexIndex, 1, sulc, () => null, grays);
    const expected = [0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.9, 0.8, 0.7, 0.4, 0.4, 0.4];
    expected.forEach((value, i) => expect(out[i]).toBeCloseTo(value, 5));
  });
```

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/surfaceParcels.test.ts`
Expected: FAIL, porque no existe el tipo y el sexto parámetro no hace nada.

- [ ] **Step 2: implementar**

En `frontend/src/logic/surfaceParcels.ts`, sustituye las cuatro constantes `GRAY_SULCUS`, `GRAY_GYRUS`, `GRAY_NO_DATA` y `GRAY_MEDIAL_WALL` por lo siguiente. Mantén el comentario largo que las precede, sobre el RGB lineal.

```ts
// Grises de la corteza en RGB lineal. Cada tema tiene los suyos (decisión
// 77, DrawTokens de theme/themes.ts). Estos son los de siempre (tema 1).
export interface CortexGrays {
  sulcus: RGB;
  gyrus: RGB;
  noData: RGB;
  medialWall: RGB;
}

function uniformGray(srgb: number): RGB {
  const v = srgbToLinear(srgb);
  return [v, v, v];
}

export const DEFAULT_CORTEX_GRAYS: CortexGrays = {
  sulcus: uniformGray(0.35),
  gyrus: uniformGray(0.72),
  noData: uniformGray(0.55),
  medialWall: uniformGray(0.25),
};

// Tokens de un tema (sRGB 0-1) a RGB lineal.
export function cortexGraysFromSrgb(tokens: {
  cortexSulcus: readonly [number, number, number];
  cortexGyrus: readonly [number, number, number];
  cortexNoData: readonly [number, number, number];
  cortexMedialWall: readonly [number, number, number];
}): CortexGrays {
  const lin = (c: readonly [number, number, number]): RGB => [
    srgbToLinear(c[0]),
    srgbToLinear(c[1]),
    srgbToLinear(c[2]),
  ];
  return {
    sulcus: lin(tokens.cortexSulcus),
    gyrus: lin(tokens.cortexGyrus),
    noData: lin(tokens.cortexNoData),
    medialWall: lin(tokens.cortexMedialWall),
  };
}
```

`type RGB` se declara más arriba en el mismo archivo y `srgbToLinear` es una declaración de función, así que ambos se pueden usar aquí.

Añade el parámetro `grays: CortexGrays = DEFAULT_CORTEX_GRAYS` al final de las dos funciones:

- `fillVertexColors(out, map, sulc, colorForRegion, grays = DEFAULT_CORTEX_GRAYS)` se lo pasa a `fillVertexColorsByIndex(..., colorForRegion, grays)`.
- En `fillVertexColorsByIndex`, sustituye el cálculo de `gray` y la rama sin color por esto, sin crear arreglos por vértice:

```ts
    let r: number;
    let g: number;
    let b: number;
    if (t !== null) {
      r = grays.sulcus[0] + (grays.gyrus[0] - grays.sulcus[0]) * t;
      g = grays.sulcus[1] + (grays.gyrus[1] - grays.sulcus[1]) * t;
      b = grays.sulcus[2] + (grays.gyrus[2] - grays.sulcus[2]) * t;
    } else {
      const base = category === NO_REGION ? grays.medialWall : grays.noData;
      [r, g, b] = base;
    }

    const color = category === NO_REGION ? null : (categoryColors[category] ?? null);
    if (color) {
      const shade = t === null ? 1 : 0.7 + 0.3 * t;
      out[v * 3] = color[0] * shade;
      out[v * 3 + 1] = color[1] * shade;
      out[v * 3 + 2] = color[2] * shade;
    } else {
      out[v * 3] = r;
      out[v * 3 + 1] = g;
      out[v * 3 + 2] = b;
    }
```

Deja intacto el comentario sobre el sombreado de las regiones pintadas (el `0.7 + 0.3 * t`).

- [ ] **Step 3: comprobar**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/surfaceParcels.test.ts && npx tsc -b`
Expected: PASS, las pruebas de antes y la nueva, y `tsc` sin errores.

- [ ] **Step 4: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/surfaceParcels.ts frontend/src/logic/surfaceParcels.test.ts
git commit -m "Temas: grises de la corteza configurables por tema

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 7: 3D con tokens y exportación del cerebro

**Files:**
- Modify: `frontend/src/components/Brain3D.tsx`, `PaintedCortex.tsx`, `ReferenceMesh.tsx`, `Tractography3D.tsx` y `TractographyNodes3D.tsx`

- [ ] **Step 1: `ReferenceMesh.tsx`**

Quita el import de `NEUTRAL_COLOR`. La función queda así (añade `useEffect` al import de React):

```tsx
export function ReferenceMesh({ url, color }: { url: string; color: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        obj.raycast = () => null;
      }
    });
    return cloned;
    // Solo al cargar: los cambios de color se aplican en el efecto de abajo,
    // sin volver a crear los materiales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);

  // Color del tema (decisión 77): se actualiza en los materiales existentes.
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) (obj.material as THREE.MeshStandardMaterial).color.set(color);
    });
  }, [scene, color]);

  return (
    <group scale={DISPLAY_SCALE}>
      <primitive object={scene} />
    </group>
  );
}
```

Actualiza el comentario del archivo que menciona `NEUTRAL_COLOR`: ahora el color llega como prop, desde el token `edge` del tema.

- [ ] **Step 2: `PaintedCortex.tsx`**

- Añade `type CortexGrays` al import de `"../logic/surfaceParcels"`.
- Añade `grays: CortexGrays;` a `interface Props` y `grays,` a los parámetros.
- En el efecto que rellena los colores, pasa `grays` como último argumento de `fillVertexColorsByIndex(...)` y de `fillVertexColors(...)`.
- Añade `grays` a su lista de dependencias: `[geometry, map, sulc, colorForRegion, paintBy, grays]`.

- [ ] **Step 3: `Brain3D.tsx`**

1. **Imports.** El bloque `import { NETWORK_COLORS, NETWORK_LABELS, NEUTRAL_COLOR, ACCENT_SELECTED_COLOR, HOMOLOGY_HIGHLIGHT_COLOR } from "../theme/networks";` pasa a ser:

   ```ts
   import { NETWORK_LABELS } from "../theme/networks";
   import { hasNetworkColor } from "../theme/colors";
   import { useDrawColors, type DrawColors } from "../theme/useDrawColors";
   ```

   `NETWORK_COLORS` deja de usarse en `Brain3D` y sale del import, porque `noUnusedLocals` daría error.

   Añade `cortexGraysFromSrgb,` al import de `"../logic/surfaceParcels"`.

2. **Fondo de la escena.** Borra `const SCENE_BG = "#1d1e26";` y el comentario que lo precede, que explica que duplica `--panel-bg`. Ahora sale del token `sceneBg`.

3. **`ExportBridge`.** Sustituye la función completa y el comentario largo que la precede, desde `// Puente para exportar el frame actual del canvas WebGL` hasta la línea anterior a `function ExportBridge`, por este texto:

   ```tsx
   // Puente para exportar el frame actual del canvas WebGL a JPEG en color
   // sobre fondo blanco (sección 20; decisiones 11, 18 y 77).
   // react-three-fiber no expone gl, scene ni camera fuera del árbol de
   // <Canvas>, así que este componente vive dentro de él y deja la función
   // de exportación en el ref que le pasa Brain3D.
   //
   // Decisión 77: antes de capturar, el cerebro se vuelve a dibujar con los
   // colores de EXPORTACIÓN (estado local «exportando» de Brain3D), no con
   // los del tema de pantalla. Si no, en un tema oscuro la selección (casi
   // blanca) desaparecería sobre el blanco del JPEG. La captura espera un
   // fotograma: en él ya están los materiales nuevos y los colores de la
   // corteza, que PaintedCortex recalcula en un efecto. Como en la decisión
   // 18, se sustituye tanto el color de "clear" como scene.background, que
   // gana siempre sobre el primero. Después se restaura el fondo y el modo
   // normal; los colores de pantalla vuelven en el siguiente render.
   function ExportBridge({
     exportRef,
     exporting,
     onExportingChange,
   }: {
     exportRef: { current: (() => void) | null };
     exporting: boolean;
     onExportingChange: (exporting: boolean) => void;
   }) {
     const { gl, scene, camera } = useThree();
     useEffect(() => {
       exportRef.current = () => onExportingChange(true);
       return () => {
         exportRef.current = null;
       };
     }, [exportRef, onExportingChange]);
     useEffect(() => {
       if (!exporting) return;
       const frame = requestAnimationFrame(() => {
         const previousClearColor = gl.getClearColor(new THREE.Color());
         const previousClearAlpha = gl.getClearAlpha();
         const previousBackground = scene.background;
         gl.setClearColor("#ffffff", 1);
         scene.background = new THREE.Color("#ffffff");
         gl.render(scene, camera);
         exportCanvasAsJpeg(gl.domElement, `neurograph-cerebro3d-${Date.now()}.jpg`);
         gl.setClearColor(previousClearColor, previousClearAlpha);
         scene.background = previousBackground;
         onExportingChange(false);
       });
       return () => cancelAnimationFrame(frame);
     }, [exporting, gl, scene, camera, onExportingChange]);
     return null;
   }
   ```

   El `"#ffffff"` se queda fijo: es el fondo de la exportación (decisión 11), no un color de tema.

4. **`NodeMesh`.**
   - Añade `colors,` a los parámetros y `colors: DrawColors;` a su tipo de props.
   - Sustituye el cálculo de `fillColor` por:

     ```ts
     const fillColor = isHomologyHighlighted ? colors.homology : colors.networkColor(node.network);
     ```

   - En el `<meshBasicMaterial` del contorno, `color={isSelected ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR}` → `color={isSelected ? colors.selected : colors.nodeRing}`.
   - El comentario del contorno (el que empieza por `{/* Halo de contorno neutro (decisión 18, 30/08/2026)`) menciona `NETWORK_COLORS` y `NEUTRAL_COLOR/ACCENT_SELECTED_COLOR (theme/ networks.ts)`. Cambia la frase que empieza por `Usa NEUTRAL_COLOR/ACCENT_SELECTED_COLOR` hasta el final del comentario por: `Usa los tokens nodeRing/selected del tema (decisión 77); al exportar, ExportBridge vuelve a dibujar con los de la paleta de exportación, así que el contorno también se ve en la figura exportada.`
   - Los `emissive="#ffffff"` y `"#000000"` se quedan: son el brillo de la esfera seleccionada, no un color de tema.

5. **`ConnectionLine`.**
   - Añade `colors` a los parámetros y `colors: DrawColors;` a sus props.
   - `const color = isSelected ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR;` → `const color = isSelected ? colors.selected : colors.edge;`.
   - En los dos materiales, `opacity={isSelected ? 0.95 : 0.55}` → `opacity={isSelected ? colors.edgeOpacitySelected : colors.edgeOpacity3d}`.

6. **Estado de exportación en `Brain3D`.** Justo después de `const handleExport = () => exportRef.current?.();` añade:

   ```ts
   const [exporting, setExporting] = useState(false);
   // Colores de dibujo; durante la exportación, los de la paleta de
   // exportación (decisión 77). El fondo de la escena usa siempre los de
   // pantalla: la exportación ya fuerza el blanco, y así no hay un destello
   // de fondo claro en los temas oscuros.
   const screenColors = useDrawColors();
   const colors = useDrawColors(exporting);
   const cortexGrays = useMemo(() => cortexGraysFromSrgb(colors), [colors]);
   ```

7. **`regionColors`.**
   - `const hex = homologyNodeIds.has(id) ? HOMOLOGY_HIGHLIGHT_COLOR : (NETWORK_COLORS[node.network] ?? "#888888");` → `const hex = homologyNodeIds.has(id) ? colors.homology : colors.networkColor(node.network);`
   - Añade `colors` a las dependencias de su `useMemo`.

8. **`networkPaint`.** Dentro de su `useMemo` ya hay una variable local llamada `colors`. Si no se renombra, taparía la de los colores del tema: `tsc` daría TS7022, y sin `tsc` fallaría el modo «vértice a vértice». Las dos líneas del final del `useMemo` quedan así:

   ```ts
   const netColors = networkSurface.networks.map((n) =>
     hexToLinearRgb(hasNetworkColor(n.slug) ? colors.networkColor(n.slug) : n.color)
   );
   return { vertexIndex, categoryCount: netColors.length, colorFor: (i) => netColors[i] ?? null };
   ```

   Se conserva el respaldo actual al color del propio archivo. Añade `colors` a las dependencias del `useMemo`.

9. **`renderFocus`.** Añade `colors={colors}` a `<NodeMesh` y a `<ConnectionLine`.

10. **Dentro de `<Canvas>`:**
    - `<color attach="background" args={[SCENE_BG]} />` → `<color attach="background" args={[screenColors.sceneBg]} />`
    - `<ExportBridge exportRef={exportRef} />` → `<ExportBridge exportRef={exportRef} exporting={exporting} onExportingChange={setExporting} />`
    - Añade `grays={cortexGrays}` a `<PaintedCortex`.
    - `<ReferenceMesh url={meshUrl} />` → `<ReferenceMesh url={meshUrl} color={colors.edge} />`

    Actualiza el comentario de `<color attach>`, que menciona `SCENE_BG = --panel-bg`: ahora es el token `sceneBg` del tema.

11. **Comprobación:**

    ```bash
    grep -n "NEUTRAL_COLOR\|ACCENT_SELECTED_COLOR\|HOMOLOGY_HIGHLIGHT_COLOR\|SCENE_BG\|\"#888" ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src/components/Brain3D.tsx
    ```

    Expected: solo aparecen en comentarios.

- [ ] **Step 4: `Tractography3D.tsx` y `TractographyNodes3D.tsx`**

En cada uno:

- Borra `const SCENE_BG = "#1d1e26";` y su comentario.
- Añade `import { useDrawColors } from "../theme/useDrawColors";`.
- Primera línea del componente exportado (`Tractography3D()` / `TractographyNodes3D()`): `const colors = useDrawColors();`.
- `args={[SCENE_BG]}` → `args={[colors.sceneBg]}`.
- En cada `<ReferenceMesh url={...} />`, añade `color={colors.edge}`.
- Los colores de los tractos (`colorForTractIndex`) y el respaldo `"#ffffff"` de `colorById.get(...) ?? "#ffffff"` no cambian: quedan fuera de esta ronda (spec, sección 2).

- [ ] **Step 5: comprobar**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx tsc -b && npm test && npm run lint
```

Expected: `tsc` sin errores, todas las pruebas en verde y ningún error de lint nuevo.

- [ ] **Step 6: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/components/Brain3D.tsx frontend/src/components/PaintedCortex.tsx frontend/src/components/ReferenceMesh.tsx frontend/src/components/Tractography3D.tsx frontend/src/components/TractographyNodes3D.tsx
git commit -m "Temas: 3D con tokens y exportacion del cerebro con colores de exportacion

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 8: engranaje y panel de Ajustes

**Files:**
- Create: `frontend/src/components/SettingsMenu.tsx`
- Modify: `frontend/src/App.tsx` (función `renderHeader`)
- Modify: `frontend/src/App.css` (estilos al final)

- [ ] **Step 1: crear `frontend/src/components/SettingsMenu.tsx`**

```tsx
// Engranaje de Ajustes (decisión 77; docs/rediseno-interfaz-diseno.md, 5.2).
// Fase 1: solo el tema. La opción «Colores de las redes» llega con la
// paleta suave, en la fase 2.
import { useEffect, useRef, useState } from "react";
import { useAppearanceStore } from "../state/appearance";
import { resolveNetworkColor } from "../theme/colors";
import { THEME_IDS, THEME_INFO } from "../theme/themes";

// Cinco redes de Cole-Anticevic para la vista previa de cada tema. En la
// fase 1, con sus colores originales en todos los temas.
const PREVIEW_NETWORKS = [
  "cole-anticevic.visual",
  "cole-anticevic.default",
  "cole-anticevic.frontoparietal",
  "cole-anticevic.dorsal-attention",
  "cole-anticevic.auditory",
];

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const theme = useAppearanceStore((state) => state.theme);
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    panelRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="settings">
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn settings__trigger"
        aria-label="Ajustes"
        title="Ajustes"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="settings__icon">
          <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open && (
        <div ref={panelRef} className="settings__panel" role="dialog" aria-label="Ajustes">
          <div className="settings__header">
            <h2>Ajustes</h2>
            <button type="button" className="icon-btn" aria-label="Cerrar ajustes" onClick={close}>
              ×
            </button>
          </div>
          <p className="settings__label" id="settings-theme-label">
            Tema
          </p>
          <div className="settings__themes" role="group" aria-labelledby="settings-theme-label">
            {THEME_IDS.map((id) => {
              const info = THEME_INFO[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="settings__theme"
                  aria-pressed={theme === id}
                  onClick={() => setTheme(id)}
                >
                  {/* data-theme-preview: index.css aplica a este elemento las
                      variables del tema que representa (decisión 77). */}
                  <span className="settings__preview" data-theme-preview={id} aria-hidden="true">
                    <span className="settings__preview-side" />
                    <span className="settings__preview-main">
                      {PREVIEW_NETWORKS.map((key) => (
                        <span key={key} className="settings__preview-dot" style={{ background: resolveNetworkColor(key) }} />
                      ))}
                    </span>
                  </span>
                  <span className="settings__theme-name">
                    {info.number} · {info.name}
                  </span>
                  <span className="settings__theme-desc">{info.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ponerlo en la barra (`App.tsx`)**

- Añade `import { SettingsMenu } from "./components/SettingsMenu";` junto a los demás imports de componentes.
- En `renderHeader`, añade `<SettingsMenu />` como último hijo de `<header className="topbar">`, después de `{controls && ...}`.

- [ ] **Step 3: estilos (al final de `App.css`)**

```css
/* Ajustes (decisión 77): engranaje a la derecha de la barra y panel
   emergente con los cuatro temas. */
.topbar .settings { margin-left: auto; position: relative; }
.topbar .topbar__controls + .settings { margin-left: 0; }
.settings__trigger { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; }
.settings__trigger[aria-expanded="true"] { background: var(--code-bg); border-color: var(--border-strong); color: var(--text-h); }
.settings__icon { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.settings__panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 20; width: 380px; box-sizing: border-box; padding: 16px; border-radius: 14px; background: var(--panel-bg); border: 1px solid var(--border-strong); box-shadow: var(--shadow); text-align: left; }
.settings__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.settings__header h2 { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--text-h); }
.settings__label { margin: 0 0 8px; font-size: 0.6rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.settings__themes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.settings__theme { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 11px; border: 1px solid var(--border); background: var(--code-bg); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.settings__theme:hover { border-color: var(--border-strong); }
.settings__theme[aria-pressed="true"] { border-color: var(--accent-border); background: var(--accent-bg); box-shadow: 0 0 0 1px var(--accent-border); }
.settings__theme:focus-visible, .settings__trigger:focus-visible, .settings__panel .icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.settings__preview { position: relative; display: block; height: 56px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg); overflow: hidden; }
.settings__preview-side { position: absolute; left: 7px; top: 7px; bottom: 7px; width: 28px; border-radius: 4px; background: var(--panel-bg); }
.settings__preview-main { position: absolute; left: 41px; right: 7px; top: 7px; bottom: 7px; border-radius: 4px; background: var(--panel-bg); display: flex; align-items: center; justify-content: center; gap: 5px; }
.settings__preview-dot { width: 9px; height: 9px; border-radius: 50%; }
.settings__theme-name { font-size: 0.72rem; font-weight: 600; color: var(--text-h); }
.settings__theme-desc { font-size: 0.64rem; line-height: 1.35; color: var(--text-muted); }
```

- [ ] **Step 4: comprobar**

Run: `cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx tsc -b && npm run lint && npm run build`
Expected: sin errores; el aviso de tamaño de bloque ya estaba.

- [ ] **Step 5: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/components/SettingsMenu.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Temas: engranaje y panel de Ajustes con los cuatro temas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 9: verificación en la app real, decisión 77 y spec

**Files:**
- Modify: `docs/analisis-arquitectura.md` (añadir la decisión 77 al final)
- Modify: `docs/rediseno-interfaz-diseno.md` (tabla 4.2: fila `nodeGap`; nota de 4.1 sobre los fondos `*-bg`)

- [ ] **Step 1: pruebas, tipos, lint y compilación**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
```

Expected:
- Todas las pruebas en verde: las 55 de antes y las nuevas de esta fase, ninguna fallida.
- Lint sin errores y con los mismos 9 avisos previos.
- La compilación termina con `✓ built`.

- [ ] **Step 2: servidor de desarrollo propio, en otro puerto**

No usar el 5173: es el de la usuaria.

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vite --port 5199 --strictPort
```

Ejecútalo en segundo plano. El backend de la usuaria, en `127.0.0.1:8420`, acepta cualquier puerto local (`allow_origin_regex` en `backend/api/main.py`). Solo se le hacen peticiones GET de lectura, desde un navegador sin interfaz y aparte, nunca desde el de la usuaria.

- [ ] **Step 3: comprobar en un navegador sin interfaz (Playwright)**

Datos para la prueba:
- Al arrancar, el cerebro 3D ya está en la vista grande (`mainView` empieza en `"brain3d"`). Para verlo en grande de nuevo, pulsa su miniatura.
- Los JPEG se descargan. En Playwright, espera el evento `download` al pulsar «Exportar JPEG», guarda el archivo con `download.saveAs(...)` en el scratchpad y ábrelo para mirarlo.

Para cada tema (`original`, `grafito`, `noche` y `claro`):

1. Ejecuta `localStorage.setItem("neurograph.apariencia", JSON.stringify({ theme: "<id>", paletteMode: null }))` y recarga.
2. Espera a que aparezca «DATOS REALES», con el atlas HCP-MMP1.0.
3. Selecciona una región: con el connectograma en grande y la lupa desactivada, haz clic en un nodo.
4. Haz una captura de pantalla completa (connectograma en grande) y otra con el cerebro 3D en grande. En esta, la corteza pintada muestra la región y sus vecinas en color y el resto en los grises del tema.

Comprueba en las capturas:
- **Original:** mismos colores que hoy (fondo `#15161c`, acento morado, redes en colores puros, corteza en los grises de siempre). Solo cambia la tipografía, también en botones y desplegables.
- **Grafito, Noche y Claro:** fondos, textos y fondo de la escena 3D del tema, sin restos del morado original. Casillas y deslizador con el color de acento del tema.
- **Engranaje:** abre el panel, que muestra los cuatro temas con el activo marcado. Escape lo cierra y el foco vuelve al engranaje.
- **Modo vértice a vértice:** con el tema Grafito, elige la clasificación Yeo 7 en «Redes» y, en «Corteza», la opción «Redes originales, vértice a vértice». Se ve la corteza pintada sin errores en la consola.

Exportación:
- **Tema Grafito:** exporta el connectograma, los hemisferios y el cerebro 3D, cada uno con una región seleccionada, y abre los JPEG.
  - Fondo blanco.
  - Líneas y anillos en los grises de Claro.
  - La selección visible: casi negra, no casi blanca.
  - En pantalla no queda nada cambiado después de exportar.
- **Tema Original:** exporta el connectograma y el cerebro 3D. Los JPEG tienen los colores de siempre.

Si algo no cuadra, corrígelo antes de seguir y apúntalo para la decisión 77.

- [ ] **Step 4: parar el servidor de desarrollo**

- [ ] **Step 5: completar el spec**

En `docs/rediseno-interfaz-diseno.md`:

- En la tabla 4.2, tras la fila de `nodeRing`, añade:

  ```
  | `nodeGap` contorno de los nodos del diagrama de síntesis | `#0b0c10` | `#0f1115` | `#0a0e17` | `#ffffff` |
  ```

- En las notas de 4.1, añade:

  ```
  - Cada color de estado tiene su fondo translúcido (`--success-bg`, `--warning-bg`, `--error-bg`, `--synthesis-bg`) en `index.css`.
  ```

- En 5.2, cambia «Al cerrar, el foco vuelve al engranaje» por:

  ```
  Con Escape o con su botón, el foco vuelve al engranaje. Con un clic fuera, el foco se queda donde se hizo clic.
  ```

- En la sección 9, tras «Unidades nuevas», añade un párrafo **Fase 1** que resuma las diferencias de la sección «Diferencias con el spec en esta fase» de este plan.

- [ ] **Step 6: escribir la decisión 77 al final de `docs/analisis-arquitectura.md`**

Sigue el formato de la decisión 76:

- Una primera línea `77. Temas de la interfaz (fase 1 del rediseño) -- dd/mm/aaaa.`, con la fecha del día en ese formato (por ejemplo, `24/09/2026`).
- Después, párrafos sangrados con cuatro espacios. Resume:
  - Qué se hizo: los cuatro temas, los tokens CSS y de dibujo, el store con persistencia, la tipografía local y la exportación con la paleta de exportación, incluido el redibujo del 3D.
  - Qué no cambia: `NETWORK_COLORS` y la lógica de representación. La única diferencia de color en el tema 1: el respaldo de una red desconocida pasa a ser siempre el gris de «sin clasificar» (`#8a8a8a`). Antes era `#888`, `#888888` o `NEUTRAL_COLOR` según el componente (spec 4.2, «se unifica»).
  - Qué queda para las fases 2 a 4.
  - Limitación conocida: en el navegador puede verse un instante el tema de reserva (el 1) antes de que `main.tsx` aplique el elegido, porque el script es un módulo y corre después de leer el HTML. En Tauri no se nota: la ventana arranca oculta. Si molestara, basta un script en línea en el `<head>` de `index.html`.
  - Un párrafo **Comprobado** con lo que se vio en el paso 3, el número de pruebas y `tsc` limpio.
- Enlaza `docs/rediseno-interfaz-diseno.md` y este plan.

- [ ] **Step 7: commit**

```bash
cd ~/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add docs/analisis-arquitectura.md docs/rediseno-interfaz-diseno.md
git commit -m "Decision 77: temas de la interfaz (fase 1 del rediseno)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
