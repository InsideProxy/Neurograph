import { describe, expect, it } from "vitest";

// Lee Brain3D.tsx como texto: no se importa porque usa <Canvas> de
// @react-three/fiber, que necesita WebGL, y vitest corre en node sin DOM.
// Igual que en theme/themeCss.test.ts: se pide "node:fs" con
// process.getBuiltinModule en vez de importarlo porque tsconfig.app.json
// solo carga los tipos de vite/client, y con la importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

const SOURCE = readFileSync(new URL("./Brain3D.tsx", import.meta.url), "utf8");

// Encuentra la etiqueta JSX que contiene el índice dado: retrocede hasta su
// "<" de apertura y avanza hasta su ">" de cierre, sin contar un ">" que
// esté dentro de una expresión "{…}" (p. ej. una comparación como
// "{a > b}"), para no cortar la etiqueta antes de tiempo.
function enclosingTag(source: string, index: number): string {
  const start = source.lastIndexOf("<", index);
  if (start === -1) throw new Error(`sin "<" antes del índice ${index}`);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    else if (source[i] === ">" && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`etiqueta sin cerrar desde el índice ${start}`);
}

// Regla de la key (Legibilidad del 3D; logic/depthFade.ts, comentario de
// fadeMaterialProps y de fadeKey): todo elemento que lleve
// {...fadeMaterialProps(fade, …)} tiene que llevar también
// key={fadeKey(fade)}. Sin ella, al alternar el interruptor de atenuación,
// react-three-fiber 9.7 repone a 0 las props del parche que desaparecen al
// desactivar, y three.js falla al volver a preparar el programa del
// material (ver el comentario de fadeKey para el porqué completo).
describe("Brain3D.tsx: regla de la key de fadeMaterialProps", () => {
  const occurrences = [...SOURCE.matchAll(/\{\.\.\.fadeMaterialProps\(/g)];

  it("hay elementos que usan fadeMaterialProps (si no, las pruebas de abajo no comprueban nada)", () => {
    expect(occurrences.length).toBeGreaterThan(0);
  });

  occurrences.forEach((match, i) => {
    const index = match.index!;
    it(`el elemento con fadeMaterialProps #${i + 1} (índice ${index}) lleva key={fadeKey(fade)}`, () => {
      expect(enclosingTag(SOURCE, index)).toContain("key={fadeKey(fade)}");
    });
  });
});
