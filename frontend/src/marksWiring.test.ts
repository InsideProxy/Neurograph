import { describe, expect, it } from "vitest";

// Cómo se conectan las marcas de regiones (docs/rediseno-interfaz-diseno.md,
// 5.9) donde no se puede probar en node: App.tsx, que dibuja toda la
// aplicación, la exportación de los SVG, que necesita el navegador, y los
// estilos. La lógica se prueba aparte (state/marks.test.ts,
// state/history.test.ts, logic/historyStep.test.ts y logic/marks.test.ts);
// esto guarda las líneas que la conectan.
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

const APP = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const APP_CSS = readFileSync(new URL("./App.css", import.meta.url), "utf8");
const EXPORT_IMAGE = readFileSync(new URL("./logic/exportImage.ts", import.meta.url), "utf8");

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
    const rules = [...APP_CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
      selectors: selectors.split(",").map((s) => s.trim()),
      body,
    }));
    for (const selector of [".viz-svg", ".legend-svg"]) {
      const bodies = rules.filter((rule) => rule.selectors.includes(selector)).map((rule) => rule.body).join(" ");
      expect(bodies, selector).toContain("-webkit-user-select: none;");
      expect(bodies, selector).toContain(" user-select: none;");
    }
  });
});
