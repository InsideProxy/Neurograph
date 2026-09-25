import { describe, expect, it } from "vitest";

// Cómo se conectan las marcas de regiones al cerebro 3D
// (docs/rediseno-interfaz-diseno.md, 5.9). El store, el gesto, las texturas y
// la geometría del anillo se prueban aparte (state/marks.test.ts,
// logic/marks.test.ts, logic/textSprite.test.ts y logic/markerSize.test.ts);
// esto guarda las líneas de Brain3D.tsx y PaintedCortex.tsx donde está la
// regla:
// - no se dibujan mientras se captura la exportación: el JPEG sale como sin
//   ellas;
// - se dibujan también fuera de la selección y con el mapa entero pintado,
//   por el mismo camino que el foco (NodeMesh, con la oclusión: tenues tras
//   la corteza);
// - Ctrl+clic en el marcador, o en la región de la corteza pintada, marca;
//   el clic normal selecciona;
// - sin selección ni corteza pintada, el lienzo que solo muestra marcas no
//   ofrece exportar: saldría vacío.
//
// Lee los archivos como texto, igual que Brain3D.occlusionWiring.test.ts:
// usan <Canvas> y los hooks de @react-three/fiber, que necesitan WebGL, y
// vitest corre en node sin DOM.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

const BRAIN = readFileSync(new URL("./Brain3D.tsx", import.meta.url), "utf8");
const CORTEX = readFileSync(new URL("./PaintedCortex.tsx", import.meta.url), "utf8");

describe("marcas en el 3D: conexión en Brain3D.tsx y PaintedCortex.tsx", () => {
  it("no se dibujan mientras se captura la exportación", () => {
    expect(BRAIN).toContain('const drawMarks = exportPhase !== "capturing";');
    expect(BRAIN).toContain("const markedOutside = drawMarks ? markedNodes.filter((node) => !focusIds.has(node.id)) : [];");
    expect(BRAIN).toContain("mark={drawMarks && markedIds.has(node.id) ? markLook : null}");
    expect(BRAIN.match(/markLook/g)).toHaveLength(2);
  });

  it("solo las regiones marcadas que pasan los filtros", () => {
    expect(BRAIN).toContain("const markedNodes = nodes.filter((node) => markedIds.has(node.id));");
  });

  it("se dibujan también sin selección, con el foco y por su mismo camino", () => {
    expect(BRAIN).not.toContain("if (!focus) return null;");
    expect(BRAIN).toContain("if (!focus && markedOutside.length === 0) return null;");
    expect(BRAIN).toContain("for (const node of [...(focus?.nodes ?? []), ...markedOutside]) {");
    expect(BRAIN.match(/<NodeMesh\b/g)).toHaveLength(1);
  });

  it("el anillo y la pastilla usan la oclusión, como el marcador y su etiqueta", () => {
    expect(BRAIN).toMatch(
      /<spriteMaterial\s+map=\{mark\.ringTexture\}[^>]*\{\.\.\.occlusionMaterialProps\(occlusion, \{ opaque: false, overlay \}\)\}/,
    );
    expect(BRAIN).toContain("pill={mark?.pill ?? null}");
    expect(BRAIN).toMatch(/const label = useMemo\(\(\) => getLabelTexture\(node\.abbreviation \?\? "", pill\), \[node\.abbreviation, pill\]\);/);
  });

  it("Ctrl+clic en el marcador o en la región de la corteza pintada marca; el clic normal selecciona", () => {
    expect(BRAIN).toContain(
      "onClick={(event) => (isMarkGesture(event.nativeEvent) ? toggleMark(node.id) : toggleNode(node.id))}",
    );
    expect(BRAIN).toMatch(/if \(isMarkGesture\(keys\)\) toggleMark\(id\);\s*else toggleNode\(id\);/);
    expect(CORTEX).toContain("if (region !== null) onRegionClick(region, e.nativeEvent);");
  });

  // react-three-fiber entrega el clic a todo lo que atraviesa el rayo, y las
  // líneas de three.js se alcanzan desde lejos (Line.threshold, 1 unidad de
  // la escena, 40 mm): el Ctrl+clic en un marcador también llegaría a las
  // líneas de detrás, y seleccionar una vaciaría la selección de regiones.
  it("un Ctrl+clic que también alcanza una línea no la selecciona", () => {
    expect(BRAIN).toContain("if (!isMarkGesture(event.nativeEvent)) onClick();");
    expect(BRAIN).toContain("{...(overlay ? overlayNoRaycast(true) : { onClick: handleClick })}");
  });

  it("sin selección ni corteza pintada, el lienzo muestra las marcas, salvo mientras carga el mapa de la corteza, y no ofrece exportar", () => {
    expect(BRAIN).toContain("if (!focus && !painted && (markedNodes.length === 0 || waitingForCortex)) {");
    expect(BRAIN).toMatch(/\{\(focus \|\| painted\) && \(\s*<button type="button" className="export-btn" onClick=\{handleExport\}/);
  });
});
