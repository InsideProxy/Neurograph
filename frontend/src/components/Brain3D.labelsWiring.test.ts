import { describe, expect, it } from "vitest";

// Cómo se conectan las etiquetas del cerebro 3D de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.3). La textura, su caché y la versión
// de fuentes se prueban en logic/textSprite.test.ts y
// state/labelFont.test.ts; los colores, en theme/themeCss.test.ts. Esto
// guarda las líneas de Brain3D.tsx que los conectan:
// - la etiqueta toma sus colores de `colors`, que mientras se captura el JPEG
//   son los de la paleta de exportación;
// - su textura depende de la versión de fuentes, que Brain3D pide al montar.
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
    expect(BRAIN_CODE).toContain("colors={colors} overlay={overlay} pill={mark?.pill ?? null} />");
    expect(BRAIN_CODE).toContain("const background = pill?.background ?? colors.label3dBackground;");
    expect(BRAIN_CODE).toContain("const color = pill?.color ?? colors.label3dText;");
  });

  it("la textura depende del texto, de los dos colores y de la versión de fuentes, que se pide al montar", () => {
    expect(BRAIN_CODE).toContain("const fontVersion = useLabelFontStore((state) => state.version);");
    expect(BRAIN_CODE).toContain(
      'const label = useMemo( () => getLabelTexture(node.abbreviation ?? "", { background, color }, fontVersion), ' +
        "[node.abbreviation, background, color, fontVersion], );",
    );
    expect(BRAIN_CODE).toContain("useEffect(() => { void requestLabelFont(document.fonts); }, []);");
  });
});
