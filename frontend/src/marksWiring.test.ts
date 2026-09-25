import { describe, expect, it } from "vitest";

// Cómo se conectan las marcas de regiones (docs/rediseno-interfaz-diseno.md,
// 5.9) donde no se puede probar en node: App.tsx, que dibuja toda la
// aplicación, la exportación de los SVG, que necesita el navegador, los
// clics y las teclas, que necesitan el DOM (el connectograma, también con la
// lupa, los hemisferios, el buscador y «Quitar marcas» en Filtros), y los
// estilos. La lógica se prueba aparte (state/marks.test.ts,
// state/history.test.ts, logic/historyStep.test.ts, logic/marks.test.ts y
// logic/regionSearch.test.ts); esto guarda las líneas que la conectan. Las
// del 3D, en components/Brain3D.marksWiring.test.ts.
//
// Lee los archivos como texto, igual que components/Brain3D.occlusionWiring.test.ts:
// se pide "node:fs" con process.getBuiltinModule en vez de importarlo porque
// tsconfig.app.json solo carga los tipos de vite/client, y con la
// importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const APP = read("./App.tsx");
const APP_CSS = read("./App.css");
const EXPORT_IMAGE = read("./logic/exportImage.ts");

// El código sin comentarios y con los espacios juntos: así las pruebas no
// dependen de cómo se parten las líneas.
function code(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\s+/g, " ");
}
const CONNECTOGRAM = code(read("./components/Connectogram.tsx"));
const HEMISFERIOS = code(read("./components/Hemisferios.tsx"));
const REGION_SEARCH = code(read("./components/RegionSearch.tsx"));
const MARKS_LINE = code(read("./components/MarksLine.tsx"));

// El trozo de `source` que va de `start` a `end`.
function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  expect(from, start).toBeGreaterThan(-1);
  expect(to, end).toBeGreaterThan(from);
  return source.slice(from, to);
}

// Las reglas de App.css, sin comentarios: sus selectores y sus declaraciones.
const CSS_RULES = [...APP_CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.split(",").map((selector) => selector.trim()),
  body,
}));

function declarations(selector: string): string {
  return CSS_RULES.filter((rule) => rule.selectors.includes(selector))
    .map((rule) => rule.body)
    .join(" ");
}

describe("marcas: conexión en App.tsx", () => {
  it("al cambiar de atlas, las marcas se vacían con el historial (resetForAtlasChange), sin que sea un paso", () => {
    const handler = APP.slice(APP.indexOf("function handleChangeAtlas"), APP.indexOf("const sourcesForAtlas"));
    expect(handler).toContain("resetForAtlasChange();");
    expect(handler).not.toContain("resetHistory();");
  });

  it("con otra clasificación de redes solo se vacía el historial: las marcas se conservan", () => {
    expect(APP).toMatch(/useEffect\(\(\) => \{\s*resetHistory\(\);\s*\}, \[loadedDataKey\]\);/);
    expect(APP.match(/resetForAtlasChange\(\)/g)).toHaveLength(1);
  });
});

describe("marcas: exportación y estilos", () => {
  it("la exportación de los SVG quita las marcas del clon antes de serializarlo", () => {
    const removal = EXPORT_IMAGE.indexOf("removeMarkElements(clone);");
    expect(removal).toBeGreaterThan(EXPORT_IMAGE.indexOf("const clone = svg.cloneNode(true)"));
    expect(removal).toBeLessThan(EXPORT_IMAGE.indexOf("serializeToString(clone)"));
  });

  // Al arrastrar sobre un dibujo, el navegador seleccionaba las etiquetas
  // como texto: las barras azules que vio el usuario.
  it("los dibujos no seleccionan texto al arrastrar", () => {
    for (const selector of [".viz-svg", ".legend-svg"]) {
      const bodies = declarations(selector);
      expect(bodies, selector).toContain("-webkit-user-select: none;");
      expect(bodies, selector).toContain(" user-select: none;");
    }
  });

  // Para que la lista de redes no salte mientras hay marcas: el recuadro no
  // cambia de alto al marcar más regiones, al quitar alguna ni al mostrar u
  // ocultar una red con los filtros. Sin marcas no se dibuja nada (decisión
  // del usuario, 25/09/2026): no hay recuadro que estabilizar.
  it("mientras hay marcas, la línea tiene siempre el mismo alto: la fila no se parte y debajo van dos líneas justas", () => {
    const button = declarations(".filters__marks-row > .filters__text-btn");
    expect(button).toContain("flex-shrink: 0;");
    expect(button).toContain("white-space: nowrap;");
    const detail = declarations(".filters__marks-detail");
    expect(detail).toContain("min-height: 2.8em;");
    expect(detail).toContain("line-height: 1.4;");
    const text = declarations(".filters__marks-text");
    for (const declaration of ["display: -webkit-box;", "-webkit-box-orient: vertical;", "-webkit-line-clamp: 2;", "overflow: hidden;"]) {
      expect(text).toContain(declaration);
    }
    expect(declarations(".filters__marks-text:not(:last-child)")).toContain("-webkit-line-clamp: 1;");
    expect(declarations(".filters__marks-hidden")).toContain("white-space: nowrap;");
  });

  // Una junto a otra dejaban unos 20 px para el nombre de la región.
  it("en el buscador, «seleccionada» y «marcada» van una sobre otra, sin encogerse", () => {
    const tags = declarations(".region-search__tags");
    for (const declaration of ["flex-shrink: 0;", "display: flex;", "flex-direction: column;", "align-items: flex-end;"]) {
      expect(tags).toContain(declaration);
    }
  });
});

describe.each([
  ["el connectograma", CONNECTOGRAM],
  ["los hemisferios", HEMISFERIOS],
])("marcas: clics en %s", (_view, source) => {
  it("Ctrl+clic en un nodo lo marca o lo desmarca, y el clic normal lo selecciona", () => {
    expect(source).toContain(
      "const clickNode = (id: string, keys: ClickKeys) => (isMarkGesture(keys) ? toggleMark(id) : toggleNode(id));",
    );
    expect(source).toContain("onClick={(event) => clickNode(node.id, event)}");
    // Ningún otro clic selecciona un nodo sin pasar por clickNode.
    expect(source.match(/toggleNode\(/g)).toHaveLength(1);
  });

  // Seleccionar la conexión vaciaría la selección de regiones.
  it("un Ctrl+clic que no acierta con el nodo y cae en una línea no la selecciona", () => {
    expect(source).toContain("onClick={(event) => { if (!isMarkGesture(event)) selectConnection(conn.id); }}");
    expect(source.match(/selectConnection\(/g)).toHaveLength(1);
  });
});

describe("marcas: la lupa del connectograma", () => {
  // Con la lupa, el clic se captura antes de llegar al nodo o a la línea.
  it("el clic que captura sobre un nodo, o cerca, también marca con Ctrl", () => {
    const capture = between(CONNECTOGRAM, "const handleSvgClickCapture", "const hoveredNode");
    expect(capture).toContain("if (id) { event.stopPropagation(); clickNode(id, event); }");
  });

  it("el anillo de una región marcada lleva el atributo de las marcas, que la exportación quita del clon", () => {
    const lens = CONNECTOGRAM.slice(CONNECTOGRAM.indexOf("function ConnectogramLens("));
    expect(lens).toContain(
      "{isMarked && ( <circle {...MARK_ELEMENT} cx={p.x} cy={p.y} r={markedRing.radius} fill={colors.sceneBg} stroke={colors.mark} ",
    );
  });
});

describe("marcas: teclado y Filtros", () => {
  it("Ctrl+Intro en el buscador marca o desmarca la sugerencia activa en lugar de añadirla a la selección", () => {
    const keyDown = between(REGION_SEARCH, "const onKeyDown = ", "const onFocusChange");
    expect(keyDown).toContain(
      'searchKey(event.key, { open, active: current, count: suggestions.length, hasText: query !== "" }, event);',
    );
    expect(keyDown).toContain(
      'case "mark": { event.preventDefault(); const suggestion = suggestions[action.index]; if (suggestion) toggleMark(suggestion.id); return; }',
    );
    expect(REGION_SEARCH).toContain("const toggleMark = useMarksStore((state) => state.toggleMark);");
  });

  it("«Quitar marcas» de Filtros vacía las marcas del store", () => {
    expect(MARKS_LINE).toContain("const clearMarks = useMarksStore((state) => state.clearMarks);");
    expect(MARKS_LINE).toContain("onClear={clearMarks}");
  });
});
