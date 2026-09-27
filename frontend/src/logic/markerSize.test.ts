import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LABEL_CLEARANCE, labelAnchor, labelStart, markRing3d, markerSize } from "./markerSize";

// Radios de antes de la Legibilidad del 3D, para comparar.
const OLD_RADIUS = 0.06;
const OLD_SELECTED_RADIUS = 0.09;
const OLD_OUTLINE_SCALE = 1.18;

describe("markerSize", () => {
  it("el radio base es la mitad del de antes y el de la región seleccionada, un 40 % mayor", () => {
    expect(markerSize(false).radius).toBeCloseTo(OLD_RADIUS / 2, 10);
    expect(markerSize(true).radius / markerSize(false).radius).toBeCloseTo(1.4, 10);
  });

  it("el anillo del contorno de un marcador normal mide lo mismo que antes", () => {
    const { radius, outlineScale } = markerSize(false);
    expect(radius * (outlineScale - 1)).toBeCloseTo(OLD_RADIUS * (OLD_OUTLINE_SCALE - 1), 10);
  });

  it("el anillo de la región seleccionada no es más fino que el de un marcador normal", () => {
    const ring = (s: ReturnType<typeof markerSize>) => s.radius * (s.outlineScale - 1);
    expect(ring(markerSize(true))).toBeGreaterThanOrEqual(ring(markerSize(false)));
  });

  it("la zona de clic es la esfera de antes y envuelve el contorno", () => {
    expect(markerSize(false).hitRadius).toBe(OLD_RADIUS);
    expect(markerSize(true).hitRadius).toBe(OLD_SELECTED_RADIUS);
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      expect(size.hitRadius).toBeGreaterThan(size.radius * size.outlineScale);
    }
  });
});

// Anillo de una región marcada en el 3D (spec 5.9): como en los dibujos, un
// hueco del color del fondo y el anillo del color de marca, fuera del
// contorno neutro del marcador.
describe("markRing3d", () => {
  it("el hueco empieza en el borde del contorno neutro, y el anillo va detrás", () => {
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      const ring = markRing3d(size);
      expect(ring.gapInner).toBeCloseTo(size.radius * size.outlineScale, 10);
      expect(ring.ringInner).toBeGreaterThan(ring.gapInner);
      expect(ring.outerRadius).toBeGreaterThan(ring.ringInner);
    }
  });

  it("guarda la proporción con el marcador: una sola textura sirve para el normal y el seleccionado", () => {
    const normal = markRing3d(markerSize(false));
    const selected = markRing3d(markerSize(true));
    expect(selected.outerRadius).toBeGreaterThan(normal.outerRadius);
    expect(selected.ringInner / selected.outerRadius).toBeCloseTo(normal.ringInner / normal.outerRadius, 10);
    expect(selected.gapInner / selected.outerRadius).toBeCloseTo(normal.gapInner / normal.outerRadius, 10);
  });
});

// La etiqueta, al lado del marcador (fase 4 del rediseño; decisión del
// usuario del 25/09/2026).
describe("labelStart y labelAnchor", () => {
  it("la etiqueta empieza pasado el contorno del marcador, o el anillo de una región marcada, con el mismo hueco", () => {
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      const outline = size.radius * size.outlineScale;
      expect(labelStart(size, false) - outline).toBeCloseTo(LABEL_CLEARANCE, 12);
      expect(labelStart(size, true) - markRing3d(size).outerRadius).toBeCloseTo(LABEL_CLEARANCE, 12);
      expect(labelStart(size, true)).toBeGreaterThan(labelStart(size, false));
    }
    expect(LABEL_CLEARANCE).toBeGreaterThan(0);
  });

  // Con three.js de verdad: su raycast del sprite usa el ancla igual que su
  // shader al dibujarlo. La cámara es la de partida de Brain3D, en el eje X y
  // con Z hacia arriba (Controls): la derecha de la pantalla es +Y. El sprite
  // está en el centro del marcador, en el origen, y el plano del sprite, de
  // cara a la cámara, es x = 0: el rayo que pasa por (0, y, z) lo corta ahí.
  it("con el ancla, three.js pone la etiqueta a la derecha del marcador en pantalla, desde labelStart y centrada en vertical", () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(6, 0, 0);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const [width, height] = [0.3, 0.13];
    const start = labelStart(markerSize(false), false);
    const label = new THREE.Sprite();
    label.scale.set(width, height, 1);
    label.center.set(...labelAnchor(start, width));
    label.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    const hits = (y: number, z: number) => {
      const screen = new THREE.Vector3(0, y, z).project(camera);
      raycaster.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
      return raycaster.intersectObject(label).length > 0;
    };
    const d = 0.004;
    // A lo ancho: de start a start + ancho, a la derecha.
    expect(hits(start + d, 0)).toBe(true);
    expect(hits(start - d, 0)).toBe(false);
    expect(hits(start + width - d, 0)).toBe(true);
    expect(hits(start + width + d, 0)).toBe(false);
    // A lo alto: centrada en la altura del marcador.
    expect(hits(start + width / 2, height / 2 - d)).toBe(true);
    expect(hits(start + width / 2, -height / 2 + d)).toBe(true);
    expect(hits(start + width / 2, height / 2 + d)).toBe(false);
    expect(hits(start + width / 2, -height / 2 - d)).toBe(false);
    // Ni sobre el marcador ni a su izquierda.
    expect(hits(0, 0)).toBe(false);
    expect(hits(-start - width / 2, 0)).toBe(false);
  });
});
