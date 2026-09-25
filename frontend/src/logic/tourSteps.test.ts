import { describe, expect, it } from "vitest";
import {
  TOUR_ANCHORS,
  TOUR_STEPS,
  anchorSelectors,
  platformShortcuts,
  progressText,
  stepAnnouncement,
  stepDescription,
  type TourAnchor,
} from "./tourSteps";

const LINUX = "Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15";
const byId = (id: string) => {
  const step = TOUR_STEPS.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`falta el paso ${id}`);
  return step;
};
const full = (id: string) => `${byId(id).title} ${byId(id).text} ${byId(id).demo}`;

describe("pasos del tour guiado (spec 5.10)", () => {
  it("son 13, en el orden del guion, con ids únicos", () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual([
      "bienvenida",
      "atlas-y-redes",
      "mostrar-ocultar",
      "resaltar",
      "anadir",
      "peso",
      "seleccionar",
      "buscar",
      "marcar",
      "lupa",
      "vista",
      "deshacer",
      "fin",
    ]);
  });

  it("cada paso tiene título y texto, y un ancla de las que hay en la interfaz o ninguna (caja centrada)", () => {
    for (const step of TOUR_STEPS) {
      expect(step.title.trim(), step.id).not.toBe("");
      expect(step.text.trim(), step.id).not.toBe("");
      for (const anchor of [step.anchor, step.fallback]) {
        if (anchor) expect(TOUR_ANCHORS, step.id).toContain(anchor.tour);
      }
    }
    // Solo la bienvenida va sin ancla: el resto señala algo de la pantalla.
    expect(TOUR_STEPS.filter((step) => step.anchor === null).map((step) => step.id)).toEqual(["bienvenida"]);
  });

  it("las anclas que dependen de los datos (la fila de una red) tienen otra de respaldo", () => {
    for (const step of TOUR_STEPS) {
      if (step.anchor?.tour === "red") expect(step.fallback, step.id).toEqual({ tour: "redes" });
    }
  });

  it("los cinco verbos quedan separados, cada uno en su paso", () => {
    expect(full("mostrar-ocultar")).toMatch(/muestra u oculta/);
    expect(full("mostrar-ocultar")).toMatch(/qué se dibuja/);
    // ◎ Resaltar es exclusivo: sustituye la selección.
    expect(full("resaltar")).toMatch(/◎ Resaltar/);
    expect(full("resaltar")).toMatch(/exclusivo/);
    expect(full("resaltar")).toMatch(/sustituye/);
    // + Añadir suma, sin quitar.
    expect(full("anadir")).toMatch(/\+ Añadir/);
    expect(full("anadir")).toMatch(/suma/);
    expect(full("anadir")).toMatch(/sin quitar/);
    // Seleccionar: un clic que añade o quita.
    expect(full("seleccionar")).toMatch(/Seleccionar/);
    expect(full("seleccionar")).toMatch(/la añade/);
    expect(full("seleccionar")).toMatch(/la quita/);
    // Marcar: solo señala, sin cambiar lo que se dibuja ni la selección.
    expect(full("marcar")).toMatch(/Marcar/);
    expect(full("marcar")).toMatch(/solo señala/);
    expect(full("marcar")).toMatch(/ni lo que se dibuja/);
    expect(full("marcar")).toMatch(/Ctrl\+clic/);
    expect(full("marcar")).toMatch(/Ctrl\+Intro/);
    // Y no se cruzan: «marcar» ya no nombra las casillas de las redes
    // (spec 5.9), así que ningún paso dice «marcar todas» ni «desmarcar».
    for (const step of TOUR_STEPS) {
      expect(full(step.id), step.id).not.toMatch(/desmarc|marcar todas|marcarla|marca la casilla/i);
    }
    expect(full("mostrar-ocultar")).not.toMatch(/marca/i);
  });

  it("el ejemplo es el real del guion", () => {
    expect(full("bienvenida")).toMatch(/HCP-MMP1\.0/);
    expect(full("atlas-y-redes")).toMatch(/Cole-Anticevic/);
    expect(full("mostrar-ocultar")).toMatch(/Frontoparietal y Lenguaje/);
    expect(full("seleccionar")).toMatch(/IFJp \(izq\.\)/);
    expect(full("buscar")).toMatch(/«TE1m»/);
    expect(full("buscar")).toMatch(/Ctrl\+K/);
    expect(full("marcar")).toMatch(/V1 \(izq\.\)/);
    expect(full("deshacer")).toMatch(/Ctrl\+Z/);
    expect(full("deshacer")).toMatch(/Ctrl\+Mayús\+Z/);
    expect(full("fin")).toMatch(/«\?»/);
  });

  it("dice «más de 64 000 conexiones» con el espacio duro de las cifras de la app", () => {
    expect(byId("mostrar-ocultar").demo).toContain("64 000");
  });

  it("en tono cercano y corto: unos dos minutos de lectura en total, sin pasos larguísimos", () => {
    const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
    const perStep = TOUR_STEPS.map((step) => words(`${step.title} ${step.text} ${step.demo}`));
    for (const [index, count] of perStep.entries()) expect(count, TOUR_STEPS[index].id).toBeLessThanOrEqual(50);
    const total = perStep.reduce((sum, count) => sum + count, 0);
    // A 230 palabras por minuto, entre minuto y medio y dos y medio.
    expect(total / 230).toBeGreaterThan(1.5);
    expect(total / 230).toBeLessThan(2.5);
    // De tú: nada de «usted».
    for (const step of TOUR_STEPS) expect(full(step.id), step.id).not.toMatch(/\busted\b/i);
  });

  it("la lupa es el único paso en que se puede usar el ratón sobre lo iluminado", () => {
    expect(TOUR_STEPS.filter((step) => step.interactive).map((step) => step.id)).toEqual(["lupa"]);
  });
});

describe("texto de cada caja", () => {
  it("con datos reales, el texto y lo que hace la app; el peso elegido va en su notación", () => {
    const text = stepDescription(byId("peso"), { withDemo: true, values: { peso: "1.0e-3" } }, LINUX);
    expect(text).toContain(byId("peso").text);
    expect(text).toContain("1.0e-3");
    expect(text).not.toContain("{peso}");
  });

  it("sin datos reales, solo el texto: nada que diga que la app hace algo", () => {
    for (const step of TOUR_STEPS) {
      const text = stepDescription(step, { withDemo: false, values: { peso: "" } }, LINUX);
      expect(text, step.id).toContain(step.text);
      expect(text, step.id).not.toContain(step.demo);
      expect(text, step.id).not.toMatch(/\bAquí\b/);
    }
  });

  it("sin datos reales, la bienvenida lo dice", () => {
    const text = stepDescription(byId("bienvenida"), { withDemo: false, values: { peso: "" } }, LINUX);
    expect(text).toMatch(/no hay datos reales/);
    expect(text).toMatch(/solo te lo explico/);
  });

  it("un aviso del paso va al final (por ejemplo, si no se pudieron cargar los datos del ejemplo)", () => {
    const text = stepDescription(
      byId("atlas-y-redes"),
      { withDemo: false, values: { peso: "" }, notice: "No se pudieron cargar." },
      LINUX,
    );
    expect(text.endsWith("No se pudieron cargar.")).toBe(true);
  });

  it("en macOS, los atajos con ⌘", () => {
    expect(platformShortcuts("Ctrl+K, Ctrl+Z, Ctrl+Mayús+Z, Ctrl+clic y Ctrl+Intro", MAC)).toBe(
      "⌘K, ⌘Z, ⌘+Mayús+Z, ⌘+clic y ⌘+Intro",
    );
    expect(platformShortcuts("Ctrl+K", LINUX)).toBe("Ctrl+K");
    expect(stepDescription(byId("buscar"), { withDemo: false, values: { peso: "" } }, MAC)).toContain("⌘K");
  });

  it("el progreso es «3 de 13», y el anuncio del cambio de paso lo dice con el título", () => {
    expect(progressText(2, 13)).toBe("3 de 13");
    expect(stepAnnouncement(2, 13, "Mostrar u ocultar redes")).toBe("Paso 3 de 13: Mostrar u ocultar redes.");
  });
});

describe("anclas", () => {
  const keys = { principal: "cole-anticevic.frontoparietal", anadida: "cole-anticevic.language" };

  it("cada una es un selector por data-tour", () => {
    expect(anchorSelectors({ tour: "peso" }, keys)).toEqual(['[data-tour="peso"]']);
    expect(anchorSelectors({ tour: "vista", view: "brain3d" }, keys)).toEqual([
      '[data-tour="vista"][data-view="brain3d"]',
    ]);
  });

  it("la fila de una red lleva la clave de la red del ejemplo", () => {
    expect(anchorSelectors({ tour: "red", network: "principal" }, keys)).toEqual([
      '[data-tour="red"][data-network="cole-anticevic.frontoparietal"]',
    ]);
    expect(anchorSelectors({ tour: "red", network: "anadida" }, keys)).toEqual([
      '[data-tour="red"][data-network="cole-anticevic.language"]',
    ]);
  });

  it("sin claves (sin datos reales) o con una clave rara, la fila no tiene selector y queda el respaldo", () => {
    const anchor: TourAnchor = { tour: "red", network: "principal" };
    expect(anchorSelectors(anchor, null)).toEqual([]);
    expect(anchorSelectors(anchor, { principal: 'a"]', anadida: "b" })).toEqual([]);
    expect(anchorSelectors(anchor, null, { tour: "redes" })).toEqual(['[data-tour="redes"]']);
    expect(anchorSelectors(anchor, keys, { tour: "redes" })).toEqual([
      '[data-tour="red"][data-network="cole-anticevic.frontoparietal"]',
      '[data-tour="redes"]',
    ]);
  });
});
