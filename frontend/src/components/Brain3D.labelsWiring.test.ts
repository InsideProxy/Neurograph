import { describe, expect, it } from "vitest";

// Cómo se conectan las etiquetas del cerebro 3D de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.3). La textura, su caché y la versión
// de fuentes se prueban en logic/textSprite.test.ts y
// state/labelFont.test.ts; los colores, en theme/themeCss.test.ts; dónde va
// la etiqueta, en logic/markerSize.test.ts, y que recibe el clic antes que lo
// demás, en logic/textSprite.test.ts. Esto guarda las líneas de Brain3D.tsx
// que los conectan:
// - la etiqueta toma sus colores de `colors`, que mientras se captura el JPEG
//   son los de la paleta de exportación;
// - su textura depende de la versión de fuentes, que Brain3D pide al montar;
// - va al lado de su marcador, en pantalla (decisión del usuario del
//   25/09/2026), y la de la región seleccionada destaca;
// - un clic en ella selecciona su región, y Ctrl+clic la marca (decisión del
//   usuario del 25/09/2026), también con la corteza pintada.
//
// Lee Brain3D.tsx como texto, igual que Brain3D.occlusionWiring.test.ts: usa
// <Canvas> y los hooks de @react-three/fiber, que necesitan WebGL, y vitest
// corre en node sin DOM.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

// El código sin comentarios y con los espacios juntos.
const BRAIN_CODE = readFileSync(new URL("./Brain3D.tsx", import.meta.url), "utf8")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1")
  .replace(/\s+/g, " ");

describe("etiquetas del 3D: conexión en Brain3D.tsx", () => {
  it("la etiqueta toma el texto y el fondo de `colors`, los de exportación mientras se captura", () => {
    expect(BRAIN_CODE).toContain("const colors = useDrawColors(exportPhase === \"capturing\");");
    // Brain3D los da a cada marcador, y el marcador, a su etiqueta.
    expect(BRAIN_CODE).toContain("isHomologyHighlighted={homologyNodeIds.has(node.id)} colors={colors} occlusion={occlusion}");
    expect(BRAIN_CODE).toContain(
      "occlusion={occlusion} colors={colors} overlay={overlay} pill={mark?.pill ?? null} onClick={handleLabelClick} />",
    );
    expect(BRAIN_CODE).toContain("const background = pill?.background ?? colors.label3dBackground;");
    expect(BRAIN_CODE).toContain("const color = pill?.color ?? (selected ? colors.label3dStrong : colors.label3dText);");
  });

  it("la textura depende del texto, de los dos colores, del peso y de la versión de fuentes, que se pide al montar", () => {
    expect(BRAIN_CODE).toContain("const fontVersion = useLabelFontStore((state) => state.version);");
    expect(BRAIN_CODE).toContain(
      'const label = useMemo( () => getLabelTexture(node.abbreviation ?? "", { background, color, weight }, fontVersion), ' +
        "[node.abbreviation, background, color, weight, fontVersion], );",
    );
    expect(BRAIN_CODE).toContain("useEffect(() => { void requestLabelFont(document.fonts); }, []);");
  });

  // Antes iba 0,21 más arriba en +Y de los datos y, sobre su pastilla, tapaba
  // su propio marcador. Ahora el sprite está en el centro del marcador, a su
  // misma profundidad, y su ancla lo lleva a la derecha en pantalla: pasado
  // el contorno o, si la región está marcada, el anillo de la marca.
  it("la etiqueta va al lado de su marcador: en su centro, con el ancla desde labelStart", () => {
    expect(BRAIN_CODE).toContain(
      "<sprite position={node.position3d} center={labelAnchor(start, labelWidth)} scale={[labelWidth, labelHeight, 1]} " +
        "renderOrder={overlay ? 3 : 0} raycast={raycastLabelFirst} onClick={onClick} >",
    );
    expect(BRAIN_CODE).toContain("<NodeLabel node={node} start={labelStart(size, mark !== null)} selected={isSelected} ");
    expect(BRAIN_CODE).not.toContain("node.position3d[1] +");
  });

  // Como en la maqueta: el texto fuerte del tema (el color, arriba), en
  // negrita y algo mayor. Los colores de marca siguen ganando.
  it("la de la región seleccionada destaca: en negrita y 13/12 más alta", () => {
    expect(BRAIN_CODE).toContain("const weight = selected ? STRONG_LABEL_WEIGHT : LABEL_WEIGHT;");
    expect(BRAIN_CODE).toContain("const labelHeight = 0.13 * (selected ? STRONG_LABEL_SCALE : 1);");
  });

  // react-three-fiber entrega el clic por orden de distancia y a todo lo que
  // cruza el rayo. La etiqueta va primero (raycastLabelFirst) y lo corta: ni
  // la corteza pintada, ni la zona de clic de su marcador, ni una línea lo
  // reciben también. Con la corteza pintada, los marcadores no reciben
  // clics (overlayNoRaycast), pero la etiqueta sí: lleva su propio raycast y
  // se dibuja en los dos modos.
  it("un clic en la etiqueta selecciona su región y Ctrl+clic la marca, salvo al soltar un arrastre, también con la corteza pintada", () => {
    expect(BRAIN_CODE).toContain(
      "const handleLabelClick = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); " +
        "if (isDragRelease(event.delta)) return; if (isMarkGesture(event.nativeEvent)) toggleMark(node.id); " +
        "else toggleNode(node.id); };",
    );
    const sprite = /<sprite position=\{node\.position3d\} center=[^>]*>/.exec(BRAIN_CODE)?.[0] ?? "";
    expect(sprite).toContain("raycast={raycastLabelFirst}");
    expect(sprite).not.toContain("overlayNoRaycast");
    expect(BRAIN_CODE.match(/<NodeLabel\b/g)).toHaveLength(1);
    expect(BRAIN_CODE).toContain("</sprite> )} <NodeLabel node={node} ");
  });
});
