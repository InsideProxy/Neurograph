import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { markerSize } from "./markerSize";
import {
  CORTEX_OCCLUDER_LAYER,
  OCCLUSION_END,
  OCCLUSION_MIN,
  OCCLUSION_PASS_PRIORITY,
  OCCLUSION_PROGRAM_KEY,
  OCCLUSION_START,
  createCortexOcclusion,
  createOcclusionOverrideMaterial,
  createOcclusionTarget,
  detachCortexOcclusion,
  enableCortexOccluderLayer,
  occlusionFactor,
  occlusionMaterialProps,
  patchOcclusionShader,
  renderCortexDepth,
  viewDepthFromDepthBuffer,
  type CompilingShader,
  type CortexOcclusion,
} from "./cortexOcclusion";

// Lee el código fuente de three.js y de react-three-fiber para las guardas
// ante una actualización, al final. Igual que en logic/capture3d.test.ts y
// theme/themeCss.test.ts: se pide "node:fs" con process.getBuiltinModule en
// vez de importarlo porque tsconfig.app.json solo carga los tipos de
// vite/client, y con la importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
  readdirSync(path: URL): string[];
}
const { readFileSync, readdirSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

const readSource = (path: string): string =>
  readFileSync(new URL(`../../node_modules/${path}`, import.meta.url), "utf8");

describe("viewDepthFromDepthBuffer", () => {
  // Con near 1 y far 3, la fórmula de three.js da 3 / (2·d − 3).
  it("cuentas a mano: 0 es el plano near, 1 el far, y 0,5 queda a 1,5", () => {
    expect(viewDepthFromDepthBuffer(0, 1, 3)).toBeCloseTo(1, 12);
    expect(viewDepthFromDepthBuffer(1, 1, 3)).toBeCloseTo(3, 12);
    expect(viewDepthFromDepthBuffer(0.5, 1, 3)).toBeCloseTo(1.5, 12);
  });

  it("deshace la proyección de una cámara de three.js como la del lienzo", () => {
    const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 1000);
    camera.updateProjectionMatrix();
    for (const viewDepth of [0.5, 4.3, 6, 7.7, 30]) {
      // Un punto en el eje de la cámara, a esa distancia; su profundidad en
      // el búfer es la z normalizada llevada de [-1, 1] a [0, 1].
      const ndc = new THREE.Vector3(0, 0, -viewDepth).applyMatrix4(camera.projectionMatrix);
      expect(viewDepthFromDepthBuffer(ndc.z * 0.5 + 0.5, camera.near, camera.far)).toBeCloseTo(viewDepth, 4);
    }
  });

  it("donde no hay corteza (el búfer borrado a 1), la corteza queda en el plano far: nada tapa", () => {
    expect(viewDepthFromDepthBuffer(1, 0.1, 1000)).toBeCloseTo(1000, 6);
  });
});

describe("occlusionFactor", () => {
  const range = { start: 0.25, end: 0.75, min: 0.2 };

  it("delante de la corteza, en ella o hasta el inicio, entero", () => {
    for (const behind of [-3, -0.1, 0, 0.1, 0.25]) expect(occlusionFactor(behind, range)).toBe(1);
  });

  it("desde el fin, el mínimo", () => {
    expect(occlusionFactor(0.75, range)).toBeCloseTo(0.2, 12);
    expect(occlusionFactor(2, range)).toBeCloseTo(0.2, 12);
  });

  it("cuentas a mano dentro del tramo: 0,6 a la mitad y 0,875 a un cuarto", () => {
    // smoothstep a la mitad vale 0,5: 1 − 0,8 · 0,5.
    expect(occlusionFactor(0.5, range)).toBeCloseTo(0.6, 12);
    // A un cuarto, t = 0,25: t² · (3 − 2t) = 0,15625, y 1 − 0,8 · 0,15625.
    expect(occlusionFactor(0.375, range)).toBeCloseTo(0.875, 12);
  });

  it("no sube nunca al hundirse más", () => {
    let previous = Infinity;
    for (let behind = -0.5; behind <= 1.5; behind += 0.05) {
      const factor = occlusionFactor(behind, range);
      expect(factor).toBeLessThanOrEqual(previous);
      previous = factor;
    }
  });

  it("por defecto usa los valores de partida", () => {
    expect(occlusionFactor(OCCLUSION_START)).toBe(1);
    expect(occlusionFactor(OCCLUSION_END)).toBeCloseTo(OCCLUSION_MIN, 12);
    expect(occlusionFactor((OCCLUSION_START + OCCLUSION_END) / 2)).toBeCloseTo(1 - (1 - OCCLUSION_MIN) / 2, 12);
  });
});

describe("valores de la oclusión", () => {
  it("valores de partida del spec, en unidades de la escena (1 = 40 mm)", () => {
    expect([OCCLUSION_START, OCCLUSION_END, OCCLUSION_MIN]).toEqual([0.25, 0.75, 0.2]);
  });

  it("un tramo que sirve: el inicio antes que el fin (smoothstep no está definido si no) y un mínimo entre 0 y 1", () => {
    expect(OCCLUSION_START).toBeLessThan(OCCLUSION_END);
    expect(OCCLUSION_MIN).toBeGreaterThan(0);
    expect(OCCLUSION_MIN).toBeLessThan(1);
  });

  it("el inicio cubre la etiqueta: vista desde detrás, la de un marcador visible queda detrás de él y se ve entera", () => {
    expect(OCCLUSION_START).toBeGreaterThan(markerSize(false).labelOffset);
    expect(OCCLUSION_START).toBeGreaterThan(markerSize(true).labelOffset);
  });

  it("el inicio cubre el marcador con su contorno: la mitad que queda bajo la superficie no se atenúa", () => {
    const selected = markerSize(true);
    expect(OCCLUSION_START).toBeGreaterThan(selected.radius * selected.outlineScale);
  });

  it("la capa de la corteza no es la 0, en la que está todo, y existe en three.js (0-31)", () => {
    expect(Number.isInteger(CORTEX_OCCLUDER_LAYER)).toBe(true);
    expect(CORTEX_OCCLUDER_LAYER).toBeGreaterThan(0);
    expect(CORTEX_OCCLUDER_LAYER).toBeLessThan(32);
  });

  it("la pasada va después de los controles (prioridad 0) y antes de dibujar el lienzo (prioridad 1)", () => {
    expect(OCCLUSION_PASS_PRIORITY).toBeGreaterThan(0);
    expect(OCCLUSION_PASS_PRIORITY).toBeLessThan(1);
  });
});

// Las cuatro familias de shaders de los materiales de la capa de foco.
const families = {
  "LineBasicMaterial y MeshBasicMaterial": THREE.ShaderLib.basic,
  LineDashedMaterial: THREE.ShaderLib.dashed,
  MeshStandardMaterial: THREE.ShaderLib.physical,
  SpriteMaterial: THREE.ShaderLib.sprite,
};

const count = (source: string, text: string): number => source.split(text).length - 1;

// Todas las líneas de `original`, en el mismo orden, están en `patched`: el
// parche solo añade líneas, no quita ni cambia ninguna.
function keepsEveryLine(original: string, patched: string): boolean {
  const lines = patched.split("\n");
  let at = 0;
  for (const line of original.split("\n")) {
    while (at < lines.length && lines[at] !== line) at++;
    if (at === lines.length) return false;
    at++;
  }
  return true;
}

describe("patchOcclusionShader", () => {
  for (const [name, shader] of Object.entries(families)) {
    it(`se aplica a ${name} de esta versión de three.js, una sola vez en cada ancla`, () => {
      const patch = patchOcclusionShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error(`faltan ${patch.missing.join(", ")}`);
      expect(count(patch.vertexShader, "#include <common>\nvarying float ngViewDepth;\nvarying vec4 ngClipPosition;")).toBe(1);
      expect(
        count(patch.vertexShader, "#include <fog_vertex>\n\tngViewDepth = - mvPosition.z;\n\tngClipPosition = gl_Position;"),
      ).toBe(1);
      expect(count(patch.fragmentShader, "#include <common>\nvarying float ngViewDepth;\nvarying vec4 ngClipPosition;")).toBe(1);
      expect(count(patch.fragmentShader, "#include <opaque_fragment>\n\tgl_FragColor.a *= ngOcclusionFactor();")).toBe(1);
      expect(count(patch.vertexShader, "ngViewDepth = - mvPosition.z;")).toBe(1);
      expect(count(patch.fragmentShader, "gl_FragColor.a *=")).toBe(1);
      // Lo de three.js sigue entero y en su orden.
      expect(keepsEveryLine(shader.vertexShader, patch.vertexShader)).toBe(true);
      expect(keepsEveryLine(shader.fragmentShader, patch.fragmentShader)).toBe(true);
    });
  }

  it("keepsEveryLine detecta una línea quitada (si no, la prueba de arriba no comprobaría nada)", () => {
    const shader = THREE.ShaderLib.basic.vertexShader;
    expect(keepsEveryLine(shader, shader.replace("#include <fog_vertex>", "#include <otro>"))).toBe(false);
  });

  // Sin WebGL no se puede compilar, pero sí desplegar los #include como
  // hace three.js y mirar el orden: mvPosition y gl_Position existen antes
  // de usarse, los varyings, los uniforms y las funciones se declaran una
  // vez y antes de main, y el alfa se toca después de escribir gl_FragColor.
  const expand = (source: string): string =>
    source.replace(/^[ \t]*#include +<([\w\d./]+)>/gm, (_, name: string) =>
      expand(THREE.ShaderChunk[name as keyof typeof THREE.ShaderChunk]),
    );

  for (const [name, shader] of Object.entries(families)) {
    it(`en ${name}, con los #include desplegados, cada cosa está donde debe`, () => {
      const patch = patchOcclusionShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error(`faltan ${patch.missing.join(", ")}`);
      const vertex = expand(patch.vertexShader);
      const fragment = expand(patch.fragmentShader);
      const main = (source: string) => source.indexOf("void main()");

      for (const declaration of ["varying float ngViewDepth;", "varying vec4 ngClipPosition;"]) {
        expect(count(vertex, declaration)).toBe(1);
        expect(vertex.indexOf(declaration)).toBeLessThan(main(vertex));
      }
      expect(vertex.indexOf("vec4 mvPosition")).toBeGreaterThan(main(vertex));
      expect(vertex.indexOf("vec4 mvPosition")).toBeLessThan(vertex.indexOf("ngViewDepth = - mvPosition.z;"));
      // El último gl_Position = … antes de copiarlo: la posición definitiva.
      const clip = vertex.indexOf("ngClipPosition = gl_Position;");
      expect(vertex.lastIndexOf("gl_Position =", clip)).toBeGreaterThan(main(vertex));
      expect(vertex.indexOf("gl_Position =", clip + 1)).toBe(-1);

      for (const declaration of [
        "varying float ngViewDepth;",
        "varying vec4 ngClipPosition;",
        "uniform sampler2D ngCortexDepth;",
        "uniform float ngCameraNear;",
        "uniform float ngCameraFar;",
        "uniform float ngOcclusionStart;",
        "uniform float ngOcclusionEnd;",
        "uniform float ngOcclusionMin;",
        "uniform float ngOcclusionOn;",
        "float ngPerspectiveDepthToViewZ(",
        "float ngOcclusionFactor()",
      ]) {
        expect(count(fragment, declaration)).toBe(1);
        expect(fragment.indexOf(declaration)).toBeLessThan(main(fragment));
      }
      expect(fragment.indexOf("gl_FragColor = vec4(")).toBeGreaterThan(main(fragment));
      expect(fragment.indexOf("gl_FragColor = vec4(")).toBeLessThan(fragment.indexOf("gl_FragColor.a *="));
    });
  }

  for (const [name, shader] of Object.entries(families)) {
    it(`en ${name}, el alfa se multiplica antes de premultiplicarse`, () => {
      const patch = patchOcclusionShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error("no se aplicó");
      const premultiply = patch.fragmentShader.indexOf("#include <premultiplied_alpha_fragment>");
      if (premultiply === -1) return;
      expect(patch.fragmentShader.indexOf("gl_FragColor.a *=")).toBeLessThan(premultiply);
    });
  }

  // Las dos funciones enteras, no trozos sueltos: con trozos, cinco cambios
  // que rompen la oclusión pasaban todas las pruebas (quitar la guarda de
  // ngOcclusionOn, quitar el signo de ngCortexViewDepth, #ifndef en vez de
  // #ifdef, cambiar near y far, leer el canal .y en vez del .x). Es la cuenta
  // de occlusionFactor y la de perspectiveDepthToViewZ de three.js, que se
  // vigila al final del archivo.
  it("las dos funciones del parche, enteras: guarda, uv, signo, near/far, canal y ramas", () => {
    const shader = THREE.ShaderLib.basic;
    const patch = patchOcclusionShader(shader.vertexShader, shader.fragmentShader);
    if (!patch.ok) throw new Error("no se aplicó");
    expect(patch.fragmentShader).toContain(
      [
        "float ngPerspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {",
        "\t#ifdef USE_REVERSED_DEPTH_BUFFER",
        "\t\treturn ( near * far ) / ( ( near - far ) * depth - near );",
        "\t#else",
        "\t\treturn ( near * far ) / ( ( far - near ) * depth - far );",
        "\t#endif",
        "}",
        "float ngOcclusionFactor() {",
        "\tif ( ngOcclusionOn < 0.5 ) return 1.0;",
        "\tvec2 ngUv = ngClipPosition.xy / ngClipPosition.w * 0.5 + 0.5;",
        "\tfloat ngCortexViewDepth = - ngPerspectiveDepthToViewZ( texture2D( ngCortexDepth, ngUv ).x, ngCameraNear, ngCameraFar );",
        "\tfloat ngBehind = ngViewDepth - ngCortexViewDepth;",
        "\treturn 1.0 - ( 1.0 - ngOcclusionMin ) * smoothstep( ngOcclusionStart, ngOcclusionEnd, ngBehind );",
        "}",
      ].join("\n"),
    );
  });

  it("no incluye <packing>: el shader tendría dos veces sus funciones si alguna familia ya lo incluyera", () => {
    const shader = THREE.ShaderLib.basic;
    const patch = patchOcclusionShader(shader.vertexShader, shader.fragmentShader);
    if (!patch.ok) throw new Error("no se aplicó");
    expect(patch.fragmentShader).not.toContain("#include <packing>");
  });

  it("si falta un trozo, no toca nada y dice cuál falta", () => {
    const shader = THREE.ShaderLib.basic;
    const vertex = shader.vertexShader.replace("#include <fog_vertex>", "");
    expect(patchOcclusionShader(vertex, shader.fragmentShader)).toEqual({
      ok: false,
      missing: ["#include <fog_vertex> (vértices)"],
    });
    expect(patchOcclusionShader("void main() {}", "void main() {}")).toEqual({
      ok: false,
      missing: [
        "#include <common> (vértices)",
        "#include <fog_vertex> (vértices)",
        "#include <common> (fragmentos)",
        "#include <opaque_fragment> (fragmentos)",
      ],
    });
  });

  it("si un trozo aparece dos veces, tampoco toca nada", () => {
    const shader = THREE.ShaderLib.basic;
    const fragment = `${shader.fragmentShader}\n#include <opaque_fragment>`;
    expect(patchOcclusionShader(shader.vertexShader, fragment)).toEqual({
      ok: false,
      missing: ["#include <opaque_fragment> (fragmentos)"],
    });
  });
});

describe("createCortexOcclusion", () => {
  const compiling = (vertexShader: string, fragmentShader: string): CompilingShader => ({
    vertexShader,
    fragmentShader,
    uniforms: { diffuse: { value: 1 } },
  });
  const uniformNames = [
    "ngCortexDepth",
    "ngCameraNear",
    "ngCameraFar",
    "ngOcclusionStart",
    "ngOcclusionEnd",
    "ngOcclusionMin",
    "ngOcclusionOn",
  ] as const;

  it("parchea el shader y le da los uniforms compartidos, los mismos objetos, sin quitar los suyos", () => {
    const occlusion = createCortexOcclusion();
    const shader = compiling(THREE.ShaderLib.sprite.vertexShader, THREE.ShaderLib.sprite.fragmentShader);
    occlusion.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain("ngClipPosition = gl_Position;");
    expect(shader.fragmentShader).toContain("gl_FragColor.a *= ngOcclusionFactor();");
    for (const name of uniformNames) expect(shader.uniforms[name]).toBe(occlusion.uniforms[name]);
    expect(shader.uniforms.diffuse).toEqual({ value: 1 });
  });

  it("dos materiales del mismo lienzo comparten los uniforms: la pasada los cambia a la vez", () => {
    const occlusion = createCortexOcclusion();
    const a = compiling(THREE.ShaderLib.basic.vertexShader, THREE.ShaderLib.basic.fragmentShader);
    const b = compiling(THREE.ShaderLib.physical.vertexShader, THREE.ShaderLib.physical.fragmentShader);
    occlusion.onBeforeCompile(a);
    occlusion.onBeforeCompile(b);
    occlusion.uniforms.ngOcclusionOn.value = 1;
    expect(a.uniforms.ngOcclusionOn.value).toBe(1);
    expect(b.uniforms.ngOcclusionOn.value).toBe(1);
  });

  it("empieza apagada, sin textura, con los valores de partida", () => {
    const { uniforms } = createCortexOcclusion();
    expect(uniforms.ngOcclusionOn.value).toBe(0);
    expect(uniforms.ngCortexDepth.value).toBeNull();
    expect([uniforms.ngOcclusionStart.value, uniforms.ngOcclusionEnd.value, uniforms.ngOcclusionMin.value]).toEqual([
      OCCLUSION_START,
      OCCLUSION_END,
      OCCLUSION_MIN,
    ]);
  });

  it("cada lienzo tiene sus uniforms (la textura de profundidad es de un contexto WebGL)", () => {
    expect(createCortexOcclusion().uniforms.ngOcclusionOn).not.toBe(createCortexOcclusion().uniforms.ngOcclusionOn);
  });

  it("el programa lleva su propia clave, la de la oclusión", () => {
    expect(createCortexOcclusion().customProgramCacheKey()).toBe(OCCLUSION_PROGRAM_KEY);
    expect(OCCLUSION_PROGRAM_KEY).toBe("neurograph-oclusion-corteza-v1");
  });

  it("con un shader sin los trozos, lo deja igual, sin uniforms, y avisa", () => {
    const onMissing = vi.fn();
    const shader = compiling("void main() {}", "void main() {}");
    createCortexOcclusion(onMissing).onBeforeCompile(shader);
    expect(shader).toEqual(compiling("void main() {}", "void main() {}"));
    expect(onMissing).toHaveBeenCalledOnce();
    expect(onMissing).toHaveBeenCalledWith([
      "#include <common> (vértices)",
      "#include <fog_vertex> (vértices)",
      "#include <common> (fragmentos)",
      "#include <opaque_fragment> (fragmentos)",
    ]);
  });

  it("por defecto, el aviso sale en la consola (en desarrollo) una sola vez por combinación", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const occlusion = createCortexOcclusion();
    occlusion.onBeforeCompile(compiling("void main() {}", "void main() {}"));
    occlusion.onBeforeCompile(compiling("void main() {}", "void main() {}"));
    createCortexOcclusion().onBeforeCompile(compiling("void main() {}", "void main() {}"));
    // vitest corre en modo de desarrollo (import.meta.env.DEV).
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toMatch(/^Oclusión por la corteza: falta .* en el shader/);
    warn.mockRestore();
  });
});

// Con toStrictEqual y no toEqual, que daría por buena una prop con valor
// undefined: react-three-fiber la pondría así en el material, en lugar de la
// función de three.js o del transparent que ya lleva el elemento.
describe("occlusionMaterialProps", () => {
  const occlusion = createCortexOcclusion();
  const patch = { onBeforeCompile: occlusion.onBeforeCompile, customProgramCacheKey: occlusion.customProgramCacheKey };

  it("con la corteza pintada, el parche compartido", () => {
    expect(occlusionMaterialProps(occlusion, { opaque: false, overlay: true })).toStrictEqual(patch);
  });

  it("transparent solo en lo que era opaco y va encima de la corteza pintada", () => {
    expect(occlusionMaterialProps(occlusion, { opaque: true, overlay: true })).toStrictEqual({
      ...patch,
      transparent: true,
    });
  });

  it("sin la corteza pintada, nada: ni el parche ni transparent, como antes de la D5", () => {
    expect(occlusionMaterialProps(occlusion, { opaque: false, overlay: false })).toStrictEqual({});
    expect(occlusionMaterialProps(occlusion, { opaque: true, overlay: false })).toStrictEqual({});
  });

  it("son propiedades de los materiales de three.js: el programa lleva la clave de la oclusión", () => {
    const material = new THREE.MeshStandardMaterial();
    Object.assign(material, occlusionMaterialProps(occlusion, { opaque: true, overlay: true }));
    expect(material.transparent).toBe(true);
    expect(material.onBeforeCompile).toBe(occlusion.onBeforeCompile);
    expect(material.customProgramCacheKey()).toBe(OCCLUSION_PROGRAM_KEY);
  });
});

describe("enableCortexOccluderLayer", () => {
  it("añade la capa de la corteza y conserva la 0: la cámara del lienzo la sigue viendo", () => {
    const mesh = new THREE.Mesh();
    enableCortexOccluderLayer(mesh);
    expect(mesh.layers.isEnabled(0)).toBe(true);
    expect(mesh.layers.isEnabled(CORTEX_OCCLUDER_LAYER)).toBe(true);
    expect(mesh.layers.test(new THREE.PerspectiveCamera().layers)).toBe(true);
  });

  it("al desmontar, React la llama con null: no hace nada", () => {
    expect(() => enableCortexOccluderLayer(null)).not.toThrow();
  });
});

describe("createOcclusionTarget", () => {
  const target = createOcclusionTarget();

  it("guarda la profundidad en una textura que se puede leer después", () => {
    expect(target.depthBuffer).toBe(true);
    expect(target.depthTexture).toBeInstanceOf(THREE.DepthTexture);
  });

  it("sin antialiasing, y la profundidad se lee sin interpolar", () => {
    expect(target.samples).toBe(0);
    expect(target.depthTexture?.minFilter).toBe(THREE.NearestFilter);
    expect(target.depthTexture?.magFilter).toBe(THREE.NearestFilter);
  });
});

describe("createOcclusionOverrideMaterial", () => {
  const material = createOcclusionOverrideMaterial();

  it("solo escribe profundidad: ni color ni luces", () => {
    expect(material.colorWrite).toBe(false);
    expect(material.depthWrite).toBe(true);
    expect(material.depthTest).toBe(true);
    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });

  it("dibuja las dos caras, como el material de la corteza", () => {
    expect(material.side).toBe(THREE.DoubleSide);
  });
});

describe("renderCortexDepth", () => {
  interface Seen {
    mask: number;
    override: THREE.Material | null;
    target: THREE.WebGLRenderTarget | null;
    lightSeen: boolean;
    cortexSeen: boolean;
    markerSeen: boolean;
  }

  // Renderer falso con lo que usa la pasada. render no dibuja nada: anota
  // lo que la cámara ve y el estado del renderer y de la escena en ese
  // momento. getRenderTarget da lo que había antes de la pasada, para
  // comprobar que se restaura tal cual (el mismo objeto).
  function fakeRenderer(options: { width?: number; height?: number; lost?: boolean; onRender?: () => void } = {}) {
    const previousTarget = new THREE.WebGLRenderTarget(1, 1);
    let current: THREE.WebGLRenderTarget | null = previousTarget;
    const seen: Seen[] = [];
    const calls: string[] = [];
    const gl = {
      getContext: () => ({ isContextLost: () => options.lost ?? false }),
      getDrawingBufferSize: (v: THREE.Vector2) => v.set(options.width ?? 640, options.height ?? 480),
      getRenderTarget: () => current,
      setRenderTarget: (target: THREE.WebGLRenderTarget | null) => {
        calls.push("setRenderTarget");
        current = target;
      },
      render: (scene: THREE.Scene, camera: THREE.Camera) => {
        calls.push("render");
        seen.push({
          mask: camera.layers.mask,
          override: scene.overrideMaterial,
          target: current,
          lightSeen: scene.getObjectByName("luz")!.layers.test(camera.layers),
          cortexSeen: scene.getObjectByName("corteza")!.layers.test(camera.layers),
          markerSeen: scene.getObjectByName("marcador")!.layers.test(camera.layers),
        });
        options.onRender?.();
      },
    };
    return { gl: gl as unknown as THREE.WebGLRenderer, seen, calls, previousTarget, current: () => current };
  }

  function sceneWithCortex(): THREE.Scene {
    const scene = new THREE.Scene();
    const light = new THREE.DirectionalLight();
    light.name = "luz";
    const cortex = new THREE.Mesh();
    cortex.name = "corteza";
    enableCortexOccluderLayer(cortex);
    const marker = new THREE.Mesh();
    marker.name = "marcador";
    // Como en Brain3D.tsx: la corteza dentro de un grupo, lo demás suelto.
    const group = new THREE.Group();
    group.add(cortex);
    scene.add(light, group, marker);
    return scene;
  }

  function setup(options?: Parameters<typeof fakeRenderer>[0]) {
    const renderer = fakeRenderer(options);
    const scene = sceneWithCortex();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const target = createOcclusionTarget();
    const occlusion: CortexOcclusion = createCortexOcclusion();
    const overrideMaterial = createOcclusionOverrideMaterial();
    return { ...renderer, scene, camera, target, occlusion, overrideMaterial };
  }

  it("dibuja solo la capa de la corteza, con el material que solo escribe profundidad, en su destino", () => {
    const { gl, seen, scene, camera, target, occlusion, overrideMaterial } = setup();
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect(seen).toHaveLength(1);
    expect(seen[0].mask).toBe(1 << CORTEX_OCCLUDER_LAYER);
    expect(seen[0].override).toBe(overrideMaterial);
    expect(seen[0].target).toBe(target);
    expect(seen[0].cortexSeen).toBe(true);
    expect(seen[0].markerSeen).toBe(false);
  });

  it("la cámara ve también las luces: las del renderer no cambian entre la pasada y el lienzo", () => {
    // Si no, three.js tendría que revisar el programa de cada material con
    // luces (la corteza y los marcadores) en cada fotograma.
    const { gl, seen, scene, camera, target, occlusion, overrideMaterial } = setup();
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect(seen[0].lightSeen).toBe(true);
    // Las luces siguen en la capa 0: el lienzo las ve como siempre.
    expect(scene.getObjectByName("luz")!.layers.isEnabled(0)).toBe(true);
  });

  it("después deja como estaban las capas de la cámara, el material de la escena y el destino", () => {
    const { gl, scene, camera, target, occlusion, overrideMaterial, previousTarget, current } = setup();
    const sceneOverride = new THREE.MeshNormalMaterial();
    scene.overrideMaterial = sceneOverride;
    camera.layers.enable(3);
    const mask = camera.layers.mask;
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect(camera.layers.mask).toBe(mask);
    expect(scene.overrideMaterial).toBe(sceneOverride);
    expect(current()).toBe(previousTarget);
  });

  it("si render lanza, también lo deja todo como estaba, y la oclusión queda apagada", () => {
    const boom = new Error("boom");
    const { gl, seen, scene, camera, target, occlusion, overrideMaterial, previousTarget, current } = setup({
      onRender: () => {
        throw boom;
      },
    });
    occlusion.uniforms.ngOcclusionOn.value = 1;
    const mask = camera.layers.mask;
    expect(() => renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial)).toThrow(boom);
    // Lanzó con todo cambiado (se ve en lo que anotó render)…
    expect(seen[0].mask).toBe(1 << CORTEX_OCCLUDER_LAYER);
    expect(seen[0].override).toBe(overrideMaterial);
    // …y todo vuelve.
    expect(camera.layers.mask).toBe(mask);
    expect(scene.overrideMaterial).toBeNull();
    expect(current()).toBe(previousTarget);
    expect(occlusion.uniforms.ngOcclusionOn.value).toBe(0);
  });

  it("enciende la oclusión con la textura de profundidad y los planos near y far de la cámara", () => {
    const { gl, scene, target, occlusion, overrideMaterial } = setup();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 250);
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect(occlusion.uniforms.ngCortexDepth.value).toBe(target.depthTexture);
    expect(occlusion.uniforms.ngCameraNear.value).toBe(0.3);
    expect(occlusion.uniforms.ngCameraFar.value).toBe(250);
    expect(occlusion.uniforms.ngOcclusionOn.value).toBe(1);
  });

  it("da al destino el tamaño del búfer de dibujo, y solo lo cambia cuando cambia", () => {
    const { gl, scene, camera, target, occlusion, overrideMaterial } = setup({ width: 800, height: 600 });
    const setSize = vi.spyOn(target, "setSize");
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect([target.width, target.height]).toEqual([800, 600]);
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect(setSize).toHaveBeenCalledOnce();
    const other = fakeRenderer({ width: 1024, height: 768 });
    renderCortexDepth(other.gl, scene, camera, target, occlusion, overrideMaterial);
    expect([target.width, target.height]).toEqual([1024, 768]);
    expect(setSize).toHaveBeenCalledTimes(2);
  });

  it("con el contexto WebGL perdido, sin pasada y sin oclusión en ese fotograma", () => {
    const { gl, calls, scene, camera, target, occlusion, overrideMaterial } = setup({ lost: true });
    occlusion.uniforms.ngOcclusionOn.value = 1;
    renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
    expect(calls).toEqual([]);
    expect(occlusion.uniforms.ngOcclusionOn.value).toBe(0);
  });

  it("con el búfer de dibujo sin tamaño, tampoco", () => {
    for (const [width, height] of [
      [0, 0],
      [640, 0],
      [0, 480],
    ]) {
      const { gl, calls, scene, camera, target, occlusion, overrideMaterial } = setup({ width, height });
      occlusion.uniforms.ngOcclusionOn.value = 1;
      renderCortexDepth(gl, scene, camera, target, occlusion, overrideMaterial);
      expect(calls).toEqual([]);
      expect(occlusion.uniforms.ngOcclusionOn.value).toBe(0);
    }
  });

  it("con una cámara que no es de perspectiva, tampoco: la cuenta de la profundidad sería otra", () => {
    const { gl, calls, scene, target, occlusion, overrideMaterial } = setup();
    occlusion.uniforms.ngOcclusionOn.value = 1;
    renderCortexDepth(gl, scene, new THREE.OrthographicCamera(), target, occlusion, overrideMaterial);
    expect(calls).toEqual([]);
    expect(occlusion.uniforms.ngOcclusionOn.value).toBe(0);
  });
});

describe("detachCortexOcclusion", () => {
  it("apaga la oclusión y suelta la textura: lo que quede se dibuja entero", () => {
    const occlusion = createCortexOcclusion();
    occlusion.uniforms.ngOcclusionOn.value = 1;
    occlusion.uniforms.ngCortexDepth.value = new THREE.DepthTexture(4, 4);
    detachCortexOcclusion(occlusion);
    expect(occlusion.uniforms.ngOcclusionOn.value).toBe(0);
    expect(occlusion.uniforms.ngCortexDepth.value).toBeNull();
  });
});

// Guardas ante una actualización de three.js o de react-three-fiber: la
// oclusión depende de estos detalles de su código. `three` exporta
// `./src/*`; se lee como texto, igual que logic/capture3d.test.ts lee
// WebGLPrograms.js.
describe("guarda ante una actualización de three.js y de react-three-fiber", () => {
  it("packing.glsl.js sigue pasando la profundidad a la de la vista con la cuenta que copia el parche", () => {
    const source = readSource("three/src/renderers/shaders/ShaderChunk/packing.glsl.js");
    expect(source).toContain("float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {");
    expect(source).toContain("return ( near * far ) / ( ( far - near ) * depth - far );");
    expect(source).toContain("return ( near * far ) / ( ( near - far ) * depth - near );");
  });

  it("WebGLRenderer.js sigue usando scene.overrideMaterial y dibujando solo lo que ve la capa de la cámara", () => {
    const source = readSource("three/src/renderers/WebGLRenderer.js");
    expect(source).toContain("const overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;");
    expect(source).toContain("if ( material.allowOverride === true && overrideMaterial !== null ) {");
    // En projectObject: lo que no está en una capa de la cámara no se
    // dibuja, y las luces tampoco cuentan.
    expect(source).toContain("const visible = object.layers.test( camera.layers );");
    expect(source).toContain("if ( object.layers.test( camera.layers ) ) {");
  });

  it("el material de la corteza admite el material de la escena (allowOverride, por defecto)", () => {
    expect(new THREE.MeshStandardMaterial().allowOverride).toBe(true);
  });

  it("react-three-fiber sigue ordenando los useFrame por prioridad, con números", () => {
    const dist = new URL("../../node_modules/@react-three/fiber/dist/", import.meta.url);
    const bundles = readdirSync(dist).filter((name) => /^events-.*\.esm\.js$/.test(name));
    expect(bundles).toHaveLength(1);
    const source = readFileSync(new URL(bundles[0], dist), "utf8");
    expect(source).toContain("internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority);");
  });
});
