import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  LABEL_FONT,
  LABEL_PICK_LEAD,
  LABEL_WEIGHT,
  STRONG_LABEL_WEIGHT,
  getLabelTexture,
  getMarkRingTexture,
  labelFont,
  labelTextureKey,
  markRingTextureKey,
  raycastLabelFirst,
  type LabelStyle,
} from "./textSprite";

// Estilos de etiqueta: la de siempre en Grafito (texto del tema sobre su
// fondo translúcido) y la de una región marcada (docs/rediseno-interfaz-diseno.md, 5.9 y 6.3).
const GRAFITO: LabelStyle = { background: "rgba(22, 25, 30, 0.84)", color: "#c9ced6", weight: LABEL_WEIGHT };
const PILL: LabelStyle = { background: "#2563eb", color: "#ffffff", weight: LABEL_WEIGHT };

// Las texturas se guardan en caché (logic/textSprite.ts), por su texto, sus
// dos colores, el peso de la letra y la versión de fuentes (fase 4 del
// rediseño, spec 6.3).
describe("claves de la caché de texturas", () => {
  it("cambian con el texto, con cada color, con el peso y con la versión de fuentes", () => {
    const key = labelTextureKey("V1", GRAFITO, 0);
    expect(labelTextureKey("V1", { ...GRAFITO }, 0)).toBe(key);
    expect(labelTextureKey("V2", GRAFITO, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, background: "rgba(255, 255, 255, 0.88)" }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, color: "#3a3d43" }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, weight: STRONG_LABEL_WEIGHT }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", GRAFITO, 1)).not.toBe(key);
    expect(labelTextureKey("V1", PILL, 0)).not.toBe(key);
  });

  it("el anillo de las marcas, por el color del hueco y el del anillo", () => {
    expect(markRingTextureKey("#16191e", "#2563eb")).not.toBe(markRingTextureKey("#ffffff", "#2563eb"));
    expect(markRingTextureKey("#16191e", "#2563eb")).not.toBe(markRingTextureKey("#16191e", "#1d4ed8"));
  });
});

// Que las texturas se guardan de verdad con esas claves. En node no hay DOM:
// un <canvas> sin contexto 2D basta, porque sin él textSprite crea igual la
// textura, vacía, y la guarda.
describe("caché de texturas", () => {
  beforeAll(() => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("la misma etiqueta es la misma textura; con otro tema, otra, y en negrita, otra", () => {
    const label = getLabelTexture("V1", GRAFITO, 0);
    expect(getLabelTexture("V1", { ...GRAFITO }, 0)).toBe(label);
    expect(getLabelTexture("V1", { ...GRAFITO, color: "#3a3d43" }, 0)).not.toBe(label);
    expect(getLabelTexture("V1", PILL, 0)).not.toBe(label);
    expect(getLabelTexture("V1", { ...PILL, background: "#1d4ed8" }, 0)).not.toBe(getLabelTexture("V1", PILL, 0));
    expect(getLabelTexture("V1", { ...GRAFITO, weight: STRONG_LABEL_WEIGHT }, 0)).not.toBe(label);
  });

  it("el anillo es otra textura con otro color de hueco o de anillo, y la misma con los mismos", () => {
    const ring = getMarkRingTexture("#16191e", "#2563eb");
    expect(getMarkRingTexture("#16191e", "#2563eb")).toBe(ring);
    expect(getMarkRingTexture("#ffffff", "#2563eb")).not.toBe(ring);
    expect(getMarkRingTexture("#16191e", "#1d4ed8")).not.toBe(ring);
  });

  // Va la última: sube la versión de fuentes de la caché.
  it("cuando sube la versión de fuentes, las etiquetas se vuelven a dibujar y las de antes se liberan", () => {
    const before = getLabelTexture("V1", GRAFITO, 0);
    const disposed = vi.fn();
    before.texture.addEventListener("dispose", disposed);
    const after = getLabelTexture("V1", GRAFITO, 1);
    expect(after).not.toBe(before);
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(getLabelTexture("V1", GRAFITO, 1)).toBe(after);
  });
});

// La letra: la de siempre en 600, y en negrita (700) la de la región
// seleccionada, como en la maqueta. Es una fuente variable: la que se pide
// (LABEL_FONT, state/labelFont.ts) trae los dos pesos.
describe("letra de las etiquetas", () => {
  it("la misma familia y tamaño en los dos pesos; la que se pide es la de siempre", () => {
    expect(labelFont(LABEL_WEIGHT)).toBe(LABEL_FONT);
    expect(labelFont(STRONG_LABEL_WEIGHT)).toBe(LABEL_FONT.replace(/^600 /, "700 "));
  });
});

// El clic en las etiquetas (decisión del usuario del 25/09/2026): la etiqueta
// lo recibe antes que lo que tenga delante. react-three-fiber lo entrega por
// orden de distancia, el mismo orden en que las devuelve el raycaster de
// three.js. La cámara es la de partida de Brain3D, en el eje X, y el rayo
// pasa por el centro de la pantalla: corta un plano más cerca de la cámara
// (como la corteza), la etiqueta y otra etiqueta detrás de ella.
describe("raycastLabelFirst", () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(6, 0, 0);
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const labelAt = (name: string, x: number) => {
    const label = new THREE.Sprite();
    label.name = name;
    label.position.set(x, 0, 0);
    label.scale.set(0.3, 0.13, 1);
    label.updateMatrixWorld();
    return label;
  };
  // Un plano de cara a la cámara, un poco desplazado para que el rayo no
  // pase justo por la diagonal entre sus dos triángulos (daría dos impactos).
  const cortex = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  cortex.name = "corteza";
  cortex.position.set(0.5, 0.37, 0.21);
  cortex.rotation.y = Math.PI / 2;
  cortex.updateMatrixWorld();
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const order = (objects: THREE.Object3D[]) => raycaster.intersectObjects(objects).map((hit) => hit.object.name);

  it("sin ella, lo que queda más cerca de la cámara va primero", () => {
    expect(order([labelAt("detrás", -0.2), labelAt("delante", 0), cortex])).toEqual(["corteza", "delante", "detrás"]);
  });

  it("con ella, las etiquetas van delante de todo, y entre ellas, la de delante primero", () => {
    const [front, back] = [labelAt("delante", 0), labelAt("detrás", -0.2)];
    front.raycast = raycastLabelFirst;
    back.raycast = raycastLabelFirst;
    expect(order([back, cortex, front])).toEqual(["delante", "detrás", "corteza"]);
    // Adelantadas LABEL_PICK_LEAD, más que cualquier distancia de la escena.
    const [first] = raycaster.intersectObject(front);
    expect(first.distance + LABEL_PICK_LEAD).toBeCloseTo(6, 6);
  });
});
