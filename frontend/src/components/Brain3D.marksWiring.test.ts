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
// - el Ctrl+clic marca solo la región de delante, y no marca al soltar un
//   Ctrl+arrastre;
// - el anillo y la pastilla salen con el color de marca, sin la curva de
//   tono del lienzo;
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

// El código sin comentarios y con los espacios juntos: así las pruebas no
// dependen de cómo se parten las líneas.
function code(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\s+/g, " ");
}
const BRAIN_CODE = code(BRAIN);

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
    // Desde la fase 4 (spec 6.3), la etiqueta de siempre también va sobre una
    // pastilla, con los colores del tema: los de marca, si los hay, ganan.
    expect(BRAIN).toContain("const background = pill?.background ?? colors.label3dBackground;");
    expect(BRAIN).toContain("const color = pill?.color ?? colors.label3dText;");
  });

  // Con la curva de tono del lienzo, el azul de marca salía apagado. Desde la
  // fase 4 (spec 6.3), las etiquetas de siempre tampoco la llevan: salen con
  // los colores del tema.
  it("el anillo y todas las etiquetas, también la pastilla, sin la curva de tono", () => {
    expect(BRAIN_CODE).toContain(
      "<spriteMaterial map={label.texture} transparent depthWrite={false} depthTest={!overlay} sizeAttenuation toneMapped={false} ",
    );
    expect(BRAIN_CODE).toContain(
      "<spriteMaterial map={mark.ringTexture} transparent depthWrite={false} depthTest={!overlay} toneMapped={false} ",
    );
  });

  // react-three-fiber entrega el clic a todas las zonas de clic que cruza el
  // rayo, de la más cercana a la más lejana: sin cortarlo, un Ctrl+clic
  // marcaba a la vez V1 (izq.) y V1 (der.) en la vista lateral de partida. El
  // clic normal sigue como antes. Y un Ctrl+arrastre no hace nada en
  // OrbitControls, pero el navegador envía el clic al soltar.
  it("Ctrl+clic en el marcador marca solo la región de delante, y no al soltar un arrastre; el clic normal selecciona", () => {
    expect(BRAIN_CODE).toContain(
      "onClick={(event) => { if (!isMarkGesture(event.nativeEvent)) { toggleNode(node.id); return; } " +
        "event.stopPropagation(); if (!isDragRelease(event.delta)) toggleMark(node.id); }}",
    );
  });

  it("Ctrl+clic en la región de la corteza pintada marca, salvo al soltar un arrastre; el clic normal selecciona", () => {
    expect(CORTEX).toContain("if (region !== null) onRegionClick(region, e.nativeEvent, e.delta);");
    expect(BRAIN_CODE).toContain(
      "(region: number, keys: ClickKeys, delta: number) => { const id = painted?.map.regionIds[region]; " +
        "if (!id || !filteredNodeIds.has(id)) return; if (!isMarkGesture(keys)) toggleNode(id); " +
        "else if (!isDragRelease(delta)) toggleMark(id); }",
    );
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
