import { describe, expect, it } from "vitest";

// Cómo se conectan las marcas de regiones (docs/rediseno-interfaz-diseno.md,
// 5.9) donde no se puede probar en node: App.tsx, que dibuja toda la
// aplicación. La lógica se prueba aparte (state/marks.test.ts,
// state/history.test.ts y logic/historyStep.test.ts); esto guarda las líneas
// que la conectan.
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
