// Tour guiado (D11 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.10): los 13 pasos del guion, qué señala cada uno y cómo se dice. Un tour
// de unos dos minutos, de tú y con frases cortas, con un ejemplo real
// (HCP-MMP1.0, Cole-Anticevic y la red frontoparietal) que la app va haciendo
// sola. Lo que más importa es que queden separados los cinco verbos:
// mostrar u ocultar, ◎ Resaltar (exclusivo), + Añadir, seleccionar y marcar.
// Funciones puras: se prueban sin DOM. Qué hace la app en cada paso está en
// logic/tourPlan.ts.

// La vista que va en grande (en App, WorkspaceViewId).
export type TourMainView = "connectogram" | "hemispheres" | "brain3d";

// Los valores de data-tour que llevan los elementos de la interfaz a los que
// apunta el tour. «red» y «vista» se completan con data-network (la clave de
// la red) y data-view.
export const TOUR_ANCHORS = ["contexto-datos", "redes", "red", "peso", "seleccion", "buscador", "vista", "ayuda"] as const;
export type TourAnchorId = (typeof TOUR_ANCHORS)[number];

// Las dos redes del ejemplo que se señalan en la lista: la que se resalta y
// la que se añade. Sus claves salen de los datos (logic/tourPlan.ts).
export type TourNetworkRole = "principal" | "anadida";
export type TourNetworkKeys = Record<TourNetworkRole, string>;

export type TourAnchor =
  | { tour: Exclude<TourAnchorId, "red" | "vista"> }
  | { tour: "red"; network: TourNetworkRole }
  | { tour: "vista"; view: TourMainView };

export type TourStepId =
  | "bienvenida"
  | "atlas-y-redes"
  | "mostrar-ocultar"
  | "resaltar"
  | "anadir"
  | "peso"
  | "seleccionar"
  | "buscar"
  | "marcar"
  | "lupa"
  | "vista"
  | "deshacer"
  | "fin";

export interface TourStep {
  id: TourStepId;
  title: string;
  // Lo que explica el paso: vale con y sin datos reales.
  text: string;
  // Lo que hace la app en el paso, solo con datos reales. {peso} es el peso
  // mínimo elegido (logic/tourPlan.ts).
  demo: string;
  // Lo que señala; null, la caja centrada. fallback, si el ancla no está en
  // la página (sin datos reales no hay fila de la red frontoparietal).
  anchor: TourAnchor | null;
  fallback?: TourAnchor;
  // Dónde va la caja respecto a lo señalado (driver.js).
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
  // Lo señalado admite el ratón: la lupa se prueba pasándolo por el círculo.
  interactive?: boolean;
}

// Lo que dice la bienvenida sin datos reales (spec 5.10: lo dice en el primer
// paso).
export const EXPLAIN_ONLY_TEXT = "Ahora no hay datos reales cargados, así que solo te lo explico, sin tocar nada.";

// El espacio duro de las cifras, como en formatCount (logic/displayText.ts).
const NBSP = "\u00a0";

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "bienvenida",
    title: "Tour guiado",
    text: "En unos dos minutos te enseño lo esencial con un ejemplo real: el atlas HCP-MMP1.0 y la red frontoparietal. Ve a tu ritmo con las flechas o dale a ▶ Automático.",
    demo: "La app lo hará sola y, al salir, todo quedará como estaba.",
    anchor: null,
    side: "bottom",
    align: "center",
  },
  {
    id: "atlas-y-redes",
    title: "Atlas y redes",
    text: "Arriba eliges el atlas, que divide el cerebro en regiones, y la clasificación de redes, que las agrupa por función.",
    demo: "El ejemplo usa HCP-MMP1.0, con sus 360 regiones, y las redes de Cole-Anticevic, sin nada seleccionado.",
    anchor: { tour: "contexto-datos" },
    side: "bottom",
    align: "end",
  },
  {
    id: "mostrar-ocultar",
    title: "Mostrar u ocultar redes",
    text: "Cada casilla muestra u oculta una red: decide qué se dibuja.",
    demo: `Aquí quedan solo Frontoparietal y Lenguaje: así cruzas redes sin perderte entre más de 64${NBSP}000 conexiones.`,
    anchor: { tour: "redes" },
    side: "right",
    align: "start",
  },
  {
    id: "resaltar",
    title: "◎ Resaltar una red",
    text: "◎ Resaltar selecciona la red entera. Ojo, es exclusivo: sustituye lo que tuvieras seleccionado y te quedas solo con ella.",
    demo: "Aquí, Frontoparietal, la red que se enciende cuando algo exige atención.",
    anchor: { tour: "red", network: "principal" },
    fallback: { tour: "redes" },
    side: "right",
    align: "center",
  },
  {
    id: "anadir",
    title: "+ Añadir una red",
    text: "+ Añadir suma la red a lo que ya tienes seleccionado, sin quitar nada. Con varias regiones seleccionadas, las vistas dibujan solo las conexiones entre ellas.",
    demo: "Aquí se añade Lenguaje a Frontoparietal.",
    anchor: { tour: "red", network: "anadida" },
    fallback: { tour: "redes" },
    side: "right",
    align: "center",
  },
  {
    id: "peso",
    title: "Peso mínimo",
    text: "Sube el peso mínimo hasta que el dibujo respire: se quedan las conexiones más fuertes. Debajo del deslizador ves cuántas pasan los filtros.",
    demo: "Aquí se sube a {peso}.",
    anchor: { tour: "peso" },
    side: "right",
    align: "center",
  },
  {
    id: "seleccionar",
    title: "Seleccionar una región",
    text: "Seleccionar es un clic en una región: la añade o, si ya estaba, la quita. Sus conexiones se ven en las tres vistas.",
    demo: "Aquí se empieza de cero con IFJp (izq.), un nudo de la red frontoparietal.",
    anchor: { tour: "vista", view: "connectogram" },
    side: "right",
    align: "start",
  },
  {
    id: "buscar",
    title: "Buscar una región",
    text: "Entre tantas regiones, usa el buscador (Ctrl+K). Si lo buscado está en una red oculta, te avisa y te ofrece mostrarla. Intro añade la región a la selección.",
    demo: "Aquí se busca «TE1m»: la izquierda está en una red oculta, y la derecha se añade con Intro.",
    anchor: { tour: "buscador" },
    side: "right",
    align: "start",
  },
  {
    id: "marcar",
    title: "Marcar una región",
    text: "Marcar solo señala una región para encontrarla, sin tocar la selección ni lo que se dibuja: Ctrl+clic en la región, o Ctrl+Intro en el buscador.",
    demo: "Aquí se muestra la red Visual y se marca V1 (izq.): mira su pastilla azul y la línea «Marcadas».",
    anchor: { tour: "vista", view: "connectogram" },
    side: "right",
    align: "start",
  },
  {
    id: "lupa",
    title: "La lupa",
    text: "Con muchas regiones, los puntos quedan muy juntos. La lupa amplía lo que hay bajo el ratón, y el clic va al nodo más cercano.",
    demo: "Con las 360 regiones a la vista quedarían a unos 5 px. Ya está encendida: pasa el ratón por el círculo.",
    anchor: { tour: "vista", view: "connectogram" },
    side: "right",
    align: "start",
    interactive: true,
  },
  {
    id: "vista",
    title: "Cambiar de vista",
    text: "«Ampliar» pasa una miniatura a la vista grande, con la selección y las marcas. En el cerebro 3D, lo que queda detrás de la corteza se ve tenue.",
    demo: "Aquí se amplía el cerebro 3D.",
    anchor: { tour: "vista", view: "brain3d" },
    side: "right",
    align: "start",
  },
  {
    id: "deshacer",
    title: "Deshacer y rehacer",
    text: "¿Un clic de más? Ctrl+Z deshace y Ctrl+Mayús+Z rehace, también las marcas. ↶ y ↷ te dicen qué paso deshacen o rehacen.",
    demo: "Aquí se deshace la marca de V1 (izq.) y se vuelve a poner.",
    anchor: { tour: "seleccion" },
    side: "right",
    align: "start",
  },
  {
    id: "fin",
    title: "Listo",
    text: "Eso es todo. Cuando quieras repasarlo, el tour está en este botón «?».",
    demo: "Tu montaje ya está como lo tenías.",
    anchor: { tour: "ayuda" },
    side: "bottom",
    align: "end",
  },
];

// Los atajos como en cada sistema: en macOS, ⌘ en lugar de Ctrl, como en la
// ayuda de Filtros y en el buscador (logic/clipboard.ts, shortcutLabel):
// «⌘K» y «⌘Z» para una tecla, y «⌘+clic» o «⌘+Mayús+Z» para lo demás.
export function platformShortcuts(text: string, userAgent: string): string {
  if (!/Mac/i.test(userAgent)) return text;
  return text.replace(/Ctrl\+(?=[A-Z]\b)/g, "⌘").replace(/Ctrl\+/g, "⌘+");
}

export interface StepTextOptions {
  // Con datos reales: la app hace el paso, y se dice.
  withDemo: boolean;
  values: { peso: string };
  // Un aviso de este paso, al final: por ejemplo, que no se pudieron cargar
  // los datos del ejemplo.
  notice?: string | null;
}

// El texto de la caja de un paso: lo que explica y, con datos reales, lo que
// hace la app. Sin datos reales, la bienvenida lo dice.
export function stepDescription(step: TourStep, options: StepTextOptions, userAgent: string): string {
  const parts = [step.text];
  if (options.withDemo) parts.push(step.demo.replace("{peso}", options.values.peso));
  else if (step.id === "bienvenida") parts.push(EXPLAIN_ONLY_TEXT);
  if (options.notice) parts.push(options.notice);
  return platformShortcuts(parts.join(" "), userAgent);
}

// El paso actual en la caja: «3 de 13».
export function progressText(index: number, total: number): string {
  return `${index + 1} de ${total}`;
}

// Lo que anuncia la región viva al cambiar de paso.
export function stepAnnouncement(index: number, total: number, title: string): string {
  return `Paso ${progressText(index, total)}: ${title}.`;
}

// Los atajos de la app que no actúan mientras dura el tour, porque la página
// está atenuada: deshacer y rehacer (Ctrl+Z, Ctrl+Mayús+Z y Ctrl+Y) y el
// buscador (Ctrl+K), también con ⌘ y con la tecla física en un teclado sin
// letras latinas, como en sus propios atajos (logic/historyStep.ts y
// logic/regionSearch.ts).
export function blocksAppShortcut(event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
  const letter = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : "";
  return letter === "z" || letter === "y" || letter === "k";
}

// Una clave de red que puede ir tal cual dentro de un selector de atributo.
const SAFE_KEY = /^[\w.-]+$/;

// Los selectores de un ancla, en orden de preferencia: el suyo y, si lo hay,
// el de respaldo. La fila de una red necesita la clave de la red del ejemplo;
// sin ella (sin datos reales) queda solo el respaldo.
export function anchorSelectors(
  anchor: TourAnchor,
  keys: TourNetworkKeys | null,
  fallback?: TourAnchor,
): string[] {
  const own = (candidate: TourAnchor): string | null => {
    if (candidate.tour === "red") {
      const key = keys?.[candidate.network];
      return key !== undefined && SAFE_KEY.test(key) ? `[data-tour="red"][data-network="${key}"]` : null;
    }
    if (candidate.tour === "vista") return `[data-tour="vista"][data-view="${candidate.view}"]`;
    return `[data-tour="${candidate.tour}"]`;
  };
  return [own(anchor), fallback ? own(fallback) : null].filter((selector): selector is string => selector !== null);
}
