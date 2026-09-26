import { describe, expect, it } from "vitest";

// Cómo se conecta a la escena la oclusión por la corteza
// (docs/rediseno-interfaz-diseno.md, 6.3). Las cuentas, el parche de los
// shaders y la pasada se prueban en logic/cortexOcclusion.test.ts; esto
// guarda las líneas de Brain3D.tsx y PaintedCortex.tsx que los conectan:
// - la pasada va después de los controles (prioridad 0) y antes de que
//   ExportBridge dibuje el lienzo (prioridad 1): la profundidad de la
//   corteza es la de la cámara de este fotograma;
// - al desmontarse, la pasada apaga la oclusión en el mismo commit en que
//   react-three-fiber quita su useFrame;
// - la pasada solo se monta con la corteza pintada, y solo allí `overlay`
//   pone el parche en los materiales;
// - la malla de la corteza pintada está en la capa que dibuja la pasada.
// Sustituye a Brain3D.fadeKeyRule.test.ts, que se quitó con la atenuación de
// la D5.
//
// Lee los dos archivos como texto: no se importan porque usan <Canvas> y los
// hooks de @react-three/fiber, que necesitan WebGL, y vitest corre en node
// sin DOM. Igual que en theme/themeCss.test.ts: se pide "node:fs" con
// process.getBuiltinModule en vez de importarlo porque tsconfig.app.json solo
// carga los tipos de vite/client, y con la importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

const BRAIN = readFileSync(new URL("./Brain3D.tsx", import.meta.url), "utf8");
const CORTEX = readFileSync(new URL("./PaintedCortex.tsx", import.meta.url), "utf8");

describe("oclusión por la corteza: conexión en Brain3D.tsx y PaintedCortex.tsx", () => {
  it("la pasada usa OCCLUSION_PASS_PRIORITY, entre los controles (prioridad 0) y ExportBridge (prioridad 1)", () => {
    expect(BRAIN).toMatch(
      /renderCortexDepth\(gl, scene, camera, target, occlusion, overrideMaterial\),\s*OCCLUSION_PASS_PRIORITY,\s*\);/,
    );
    expect(BRAIN).toContain("useFrame(() => controlsRef.current?.update());");
    expect(BRAIN).toMatch(/if \(phase === "idle"\) state\.gl\.render\(state\.scene, state\.camera\);\s*\}, 1\);/);
  });

  it("al desmontarse, la pasada apaga la oclusión en un efecto de layout, como el que suscribe su useFrame", () => {
    expect(BRAIN).toMatch(/useLayoutEffect\(\s*\(\) => \(\) => \{\s*detachCortexOcclusion\(occlusion\);/);
  });

  it("solo se monta con la corteza pintada", () => {
    expect(BRAIN).toContain("{helpers && <CortexOcclusionPass occlusion={occlusion} />}");
    expect(BRAIN.match(/<CortexOcclusionPass\b/g)).toHaveLength(1);
    expect(BRAIN).toContain("const overlay = helpers !== null;");
  });

  it("la corteza pintada va en su capa", () => {
    expect(CORTEX).toContain("ref={enableCortexOccluderLayer}");
  });
});
