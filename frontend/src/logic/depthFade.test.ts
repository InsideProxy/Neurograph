import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  DEPTH_FADE_MIN,
  DEPTH_FADE_PROGRAM_KEY,
  NO_DEPTH_FADE,
  createDepthFade,
  depthBounds,
  depthExtent,
  depthFadeFactor,
  depthFadeRange,
  fadeKey,
  fadeMaterialProps,
  patchDepthFadeShader,
  tuplePoints,
  updateDepthFadeUniforms,
  type CompilingShader,
  type DepthFadeUniforms,
} from "./depthFade";

describe("depthFadeFactor", () => {
  const range = { near: 4, far: 8, fadeMin: 0.2 };

  it("hasta near se ve entero y desde far queda en fadeMin", () => {
    expect(depthFadeFactor(1, range)).toBe(1);
    expect(depthFadeFactor(4, range)).toBe(1);
    expect(depthFadeFactor(8, range)).toBeCloseTo(0.2, 10);
    expect(depthFadeFactor(20, range)).toBeCloseTo(0.2, 10);
  });

  it("a mitad del tramo, a mitad de camino (smoothstep(0,5) = 0,5)", () => {
    expect(depthFadeFactor(6, range)).toBeCloseTo(0.6, 10);
  });

  it("baja sin saltos: nunca sube al alejarse", () => {
    let previous = Infinity;
    for (let depth = 0; depth <= 10; depth += 0.25) {
      const factor = depthFadeFactor(depth, range);
      expect(factor).toBeLessThanOrEqual(previous);
      previous = factor;
    }
  });

  it("sin atenuación da exactamente 1 a cualquier profundidad", () => {
    for (const depth of [-3, 0, 0.3, 1, 7, 1e6]) expect(depthFadeFactor(depth, NO_DEPTH_FADE)).toBe(1);
  });
});

describe("depthFadeRange", () => {
  it("empieza 0,2 de la semiprofundidad por delante del centro y acaba en la cara más lejana", () => {
    const range = depthFadeRange(6, 2);
    expect(range.near).toBeCloseTo(5.6, 10);
    expect(range.far).toBeCloseTo(8, 10);
    expect(range.fadeMin).toBe(DEPTH_FADE_MIN);
  });

  it("la cara cercana del cerebro se ve entera y la más lejana queda en el mínimo", () => {
    const range = depthFadeRange(6, 2);
    expect(depthFadeFactor(6 - 2, range)).toBe(1);
    expect(depthFadeFactor(6 + 2, range)).toBeCloseTo(DEPTH_FADE_MIN, 10);
  });

  it("el mínimo queda entre 0,15 y 0,2, como pide el spec", () => {
    expect(DEPTH_FADE_MIN).toBeGreaterThanOrEqual(0.15);
    expect(DEPTH_FADE_MIN).toBeLessThanOrEqual(0.2);
  });

  it("con una semiprofundidad o una distancia que no sirven, sin atenuación", () => {
    expect(depthFadeRange(6, 0)).toEqual(NO_DEPTH_FADE);
    expect(depthFadeRange(6, -1)).toEqual(NO_DEPTH_FADE);
    expect(depthFadeRange(Number.NaN, 2)).toEqual(NO_DEPTH_FADE);
    expect(depthFadeRange(6, Number.POSITIVE_INFINITY)).toEqual(NO_DEPTH_FADE);
  });
});

describe("depthBounds", () => {
  const points: [number, number, number][] = [
    [-1, -2, -3],
    [1, 2, 3],
    [0, 1, -1],
    [10, 10, 10],
  ];

  it("centro y mitad del tamaño de la caja de los puntos", () => {
    expect(depthBounds(tuplePoints(points), 0, 3)).toEqual({ center: [0, 0, 0], halfSize: [1, 2, 3] });
  });

  it("solo cuenta los puntos del tramo y aplica la escala", () => {
    expect(depthBounds(tuplePoints(points), 2, 4, 0.5)).toEqual({ center: [2.5, 2.75, 2.25], halfSize: [2.5, 2.25, 2.75] });
  });

  it("sirve un BufferAttribute de three.js tal cual", () => {
    const attribute = new THREE.Float32BufferAttribute(points.slice(0, 3).flat(), 3);
    expect(depthBounds(attribute, 0, attribute.count)?.halfSize).toEqual([1, 2, 3]);
  });

  it("null sin puntos o con alguno que no es finito", () => {
    expect(depthBounds(tuplePoints(points), 2, 2)).toBeNull();
    expect(depthBounds(tuplePoints([[0, Number.NaN, 0]]), 0, 1)).toBeNull();
  });
});

describe("depthExtent", () => {
  const halfSize: [number, number, number] = [1.7, 2.2, 1.5];

  it("mirando a lo largo de un eje, la mitad del cerebro en ese eje", () => {
    expect(depthExtent(halfSize, [1, 0, 0])).toBeCloseTo(1.7, 10);
    expect(depthExtent(halfSize, [0, -1, 0])).toBeCloseTo(2.2, 10);
    expect(depthExtent(halfSize, [0, 0, 1])).toBeCloseTo(1.5, 10);
  });

  it("en diagonal, la del elipsoide: entre el eje más corto y el más largo", () => {
    const d = Math.SQRT1_2;
    expect(depthExtent(halfSize, [d, d, 0])).toBeCloseTo(Math.sqrt((1.7 ** 2 + 2.2 ** 2) / 2), 10);
  });
});

describe("patchDepthFadeShader", () => {
  // Las cuatro familias de shaders de los materiales de la capa de foco.
  const families = {
    "LineBasicMaterial y MeshBasicMaterial": THREE.ShaderLib.basic,
    LineDashedMaterial: THREE.ShaderLib.dashed,
    MeshStandardMaterial: THREE.ShaderLib.physical,
    SpriteMaterial: THREE.ShaderLib.sprite,
  };

  for (const [name, shader] of Object.entries(families)) {
    it(`se aplica a ${name} de esta versión de three.js`, () => {
      const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error(`faltan ${patch.missing.join(", ")}`);
      expect(patch.vertexShader).toContain("#include <common>\nvarying float ngViewDepth;");
      expect(patch.vertexShader).toContain("#include <fog_vertex>\n\tngViewDepth = - mvPosition.z;");
      expect(patch.fragmentShader).toContain(
        "#include <common>\nvarying float ngViewDepth;\nuniform float ngFadeNear;\nuniform float ngFadeFar;\nuniform float ngFadeMin;",
      );
      expect(patch.fragmentShader).toContain(
        "#include <opaque_fragment>\n\tgl_FragColor.a *= 1.0 - ( 1.0 - ngFadeMin ) * smoothstep( ngFadeNear, ngFadeFar, ngViewDepth );",
      );
    });
  }

  // Sin WebGL no se puede compilar, pero sí desplegar los #include como
  // hace three.js y mirar el orden: mvPosition existe antes de usarse, el
  // varying y los uniforms se declaran una vez, y el alfa se toca después de
  // escribir gl_FragColor.
  const expand = (source: string): string =>
    source.replace(/^[ \t]*#include +<([\w\d./]+)>/gm, (_, name: string) =>
      expand(THREE.ShaderChunk[name as keyof typeof THREE.ShaderChunk]),
    );

  for (const [name, shader] of Object.entries(families)) {
    it(`en ${name}, con los #include desplegados, cada cosa está donde debe`, () => {
      const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error(`faltan ${patch.missing.join(", ")}`);
      const vertex = expand(patch.vertexShader);
      const fragment = expand(patch.fragmentShader);
      const main = (source: string) => source.indexOf("void main()");
      expect(vertex.split("varying float ngViewDepth;")).toHaveLength(2);
      expect(vertex.indexOf("varying float ngViewDepth;")).toBeLessThan(main(vertex));
      expect(vertex.indexOf("vec4 mvPosition")).toBeGreaterThan(main(vertex));
      expect(vertex.indexOf("vec4 mvPosition")).toBeLessThan(vertex.indexOf("ngViewDepth = - mvPosition.z;"));
      for (const declaration of [
        "varying float ngViewDepth;",
        "uniform float ngFadeNear;",
        "uniform float ngFadeFar;",
        "uniform float ngFadeMin;",
      ]) {
        expect(fragment.split(declaration)).toHaveLength(2);
        expect(fragment.indexOf(declaration)).toBeLessThan(main(fragment));
      }
      expect(fragment.indexOf("gl_FragColor = vec4(")).toBeLessThan(fragment.indexOf("gl_FragColor.a *="));
    });
  }

  it("el alfa se atenúa antes de premultiplicarse", () => {
    const shader = THREE.ShaderLib.basic;
    const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
    if (!patch.ok) throw new Error("no se aplicó");
    expect(patch.fragmentShader.indexOf("gl_FragColor.a *=")).toBeLessThan(
      patch.fragmentShader.indexOf("#include <premultiplied_alpha_fragment>"),
    );
  });

  it("si falta un trozo, no toca nada y dice cuál falta", () => {
    const shader = THREE.ShaderLib.basic;
    const vertex = shader.vertexShader.replace("#include <fog_vertex>", "");
    expect(patchDepthFadeShader(vertex, shader.fragmentShader)).toEqual({
      ok: false,
      missing: ["#include <fog_vertex> (vértices)"],
    });
    expect(patchDepthFadeShader("void main() {}", "void main() {}")).toEqual({
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
    expect(patchDepthFadeShader(shader.vertexShader, fragment)).toEqual({
      ok: false,
      missing: ["#include <opaque_fragment> (fragmentos)"],
    });
  });
});

describe("createDepthFade", () => {
  const compiling = (vertexShader: string, fragmentShader: string): CompilingShader => ({
    vertexShader,
    fragmentShader,
    uniforms: { diffuse: { value: 1 } },
  });

  it("parchea el shader y le da los uniforms compartidos, los mismos objetos", () => {
    const fade = createDepthFade();
    const shader = compiling(THREE.ShaderLib.sprite.vertexShader, THREE.ShaderLib.sprite.fragmentShader);
    fade.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain("ngViewDepth = - mvPosition.z;");
    expect(shader.uniforms.ngFadeNear).toBe(fade.uniforms.ngFadeNear);
    expect(shader.uniforms.ngFadeFar).toBe(fade.uniforms.ngFadeFar);
    expect(shader.uniforms.ngFadeMin).toBe(fade.uniforms.ngFadeMin);
    expect(shader.uniforms.diffuse).toEqual({ value: 1 });
    expect(fade.customProgramCacheKey()).toBe(DEPTH_FADE_PROGRAM_KEY);
  });

  it("empieza sin atenuación", () => {
    const { uniforms } = createDepthFade();
    expect([uniforms.ngFadeNear.value, uniforms.ngFadeFar.value, uniforms.ngFadeMin.value]).toEqual([
      NO_DEPTH_FADE.near,
      NO_DEPTH_FADE.far,
      NO_DEPTH_FADE.fadeMin,
    ]);
  });

  it("con un shader sin los trozos, lo deja igual, sin uniforms, y avisa", () => {
    const onMissing = vi.fn();
    const shader = compiling("void main() {}", "void main() {}");
    createDepthFade(onMissing).onBeforeCompile(shader);
    expect(shader).toEqual(compiling("void main() {}", "void main() {}"));
    expect(onMissing).toHaveBeenCalledOnce();
  });

  it("por defecto, el aviso sale en la consola (en desarrollo) una sola vez", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fade = createDepthFade();
    fade.onBeforeCompile(compiling("void main() {}", "void main() {}"));
    fade.onBeforeCompile(compiling("void main() {}", "void main() {}"));
    // vitest corre en modo de desarrollo (import.meta.env.DEV).
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe("fadeMaterialProps", () => {
  it("sin atenuación no añade nada: el material es el de siempre", () => {
    expect(fadeMaterialProps(null, false)).toEqual({});
    expect(fadeMaterialProps(null, true)).toEqual({});
  });

  it("con atenuación, el parche compartido; transparent solo en lo que era opaco", () => {
    const fade = createDepthFade();
    const patch = { onBeforeCompile: fade.onBeforeCompile, customProgramCacheKey: fade.customProgramCacheKey };
    expect(fadeMaterialProps(fade, false)).toEqual(patch);
    expect(fadeMaterialProps(fade, true)).toEqual({ ...patch, transparent: true });
  });

  it("son propiedades de los materiales de three.js: el programa lleva la clave de la atenuación", () => {
    const fade = createDepthFade();
    const material = new THREE.MeshBasicMaterial();
    Object.assign(material, fadeMaterialProps(fade, true));
    expect(material.transparent).toBe(true);
    expect(material.onBeforeCompile).toBe(fade.onBeforeCompile);
    expect(material.customProgramCacheKey()).toBe(DEPTH_FADE_PROGRAM_KEY);
  });
});

describe("fadeKey", () => {
  it("cambia al activar o desactivar la atenuación, y solo entonces", () => {
    expect(fadeKey(createDepthFade())).not.toBe(fadeKey(null));
    expect(fadeKey(createDepthFade())).toBe(fadeKey(createDepthFade()));
  });
});

describe("updateDepthFadeUniforms", () => {
  function cameraAt(x: number, y: number, z: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    return camera;
  }
  const brain = { center: [0, 0, 0] as [number, number, number], halfSize: [1.7, 2.2, 1.5] as [number, number, number] };

  it("en la vista lateral del principio (cámara en +X), el tramo sigue el ancho del cerebro", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), brain);
    expect(uniforms.ngFadeNear.value).toBeCloseTo(6 - 0.2 * 1.7, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(6 + 1.7, 6);
    expect(uniforms.ngFadeMin.value).toBe(DEPTH_FADE_MIN);
  });

  it("desde delante, sigue el largo; y mide la profundidad del centro de la caja", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(0, -6, 0), { ...brain, center: [0, -3, 0] });
    expect(uniforms.ngFadeNear.value).toBeCloseTo(3 - 0.2 * 2.2, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(3 + 2.2, 6);
  });

  it("sin caja, sin atenuación", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), brain);
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), null);
    expect(uniforms.ngFadeMin.value).toBe(1);
  });

  // Casos límite: el tramo tiene que servir siempre, cerca antes que lejos y
  // sin NaN. En GLSL, smoothstep no está definido si el primer borde no es
  // menor que el segundo.
  function expectUsableRange(uniforms: DepthFadeUniforms) {
    for (const uniform of [uniforms.ngFadeNear, uniforms.ngFadeFar, uniforms.ngFadeMin]) {
      expect(Number.isNaN(uniform.value)).toBe(false);
    }
    expect(uniforms.ngFadeNear.value).toBeLessThan(uniforms.ngFadeFar.value);
  }

  it("con la cámara dentro de la caja (acercada con la rueda), un tramo que sirve", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(0.5, 0, 0), brain);
    expectUsableRange(uniforms);
    expect(uniforms.ngFadeNear.value).toBeCloseTo(0.5 - 0.2 * 1.7, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(0.5 + 1.7, 6);
  });

  it("con el centro de la caja detrás de la cámara, también", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), { ...brain, center: [8, 0, 0] });
    expectUsableRange(uniforms);
    expect(uniforms.ngFadeNear.value).toBeCloseTo(-2 - 0.2 * 1.7, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(-2 + 1.7, 6);
  });

  it("con una caja de tamaño cero (un solo nodo), sin atenuación y sin NaN", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), { center: [0.3, 0.1, 0.2], halfSize: [0, 0, 0] });
    expectUsableRange(uniforms);
    expect(uniforms.ngFadeMin.value).toBe(1);
  });
});
