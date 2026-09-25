// Barra superior (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.1): marca, pestañas de vista, contexto de datos (solo en la vista
// Atlas), Importar y el engranaje de Ajustes. Solo presenta: la vista
// activa, las pestañas de síntesis, el atlas elegido y los manejadores
// siguen en App.
import { useEffect, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { formatCount } from "../logic/displayText";
import { fitSignature, fitTopBar, tabAfterClosing } from "../logic/topBarFit";
import { useDrawColors } from "../theme/useDrawColors";
import { Icon, type IconName } from "./Icon";
import { SettingsMenu } from "./SettingsMenu";

export interface TopBarTab {
  id: string;
  label: string;
  icon: IconName;
  active: boolean;
  onSelect: () => void;
  // Etiqueta emergente; por defecto, el nombre de la pestaña.
  title?: string;
  // Solo las pestañas de síntesis importadas (decisión 71) se cierran.
  onClose?: () => void;
  closeLabel?: string;
}

interface TopBarProps {
  tabs: TopBarTab[];
  onImport: () => void;
  // Contexto y estado de los datos: solo en la vista Atlas.
  context?: ReactNode;
  // El botón «Importar», para devolverle el foco al cerrar el último aviso
  // (Task 3).
  importRef?: Ref<HTMLButtonElement>;
}

// Logotipo de la maqueta (decisión del usuario, 24/09/2026; principio 4
// del spec): un anillo con cuatro nodos unidos. El anillo y las uniones
// van en los grises del tema; los nodos llevan colores de red de
// Cole-Anticevic (Lenguaje, Por defecto, Frontoparietal y Visual), la
// única excepción de color fuera de los datos, porque representan justo
// eso: redes. Salen del tema activo, así que siguen a la paleta.
const LOGO_NODES = [
  { cx: 6.2, cy: 9.5, network: "cole-anticevic.language" },
  { cx: 21.8, cy: 18.5, network: "cole-anticevic.default" },
  { cx: 6.2, cy: 18.5, network: "cole-anticevic.frontoparietal" },
  { cx: 17, cy: 3.3, network: "cole-anticevic.visual" },
] as const;

function Logo() {
  const { networkColor } = useDrawColors();
  return (
    <svg className="topbar__logo" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle className="topbar__logo-ring" cx="14" cy="14" r="11" />
      <path className="topbar__logo-links" d="M6.2 9.5Q14 14 21.8 18.5 M6.2 18.5Q14 14 17 3.3" />
      {LOGO_NODES.map((node) => (
        <circle
          key={node.network}
          className="topbar__logo-node"
          cx={node.cx}
          cy={node.cy}
          r="2.4"
          fill={networkColor(node.network)}
        />
      ))}
    </svg>
  );
}

// Ancho y contenido de la barra en su última medida: si no han cambiado,
// el resultado sería el mismo. La barra se vuelve a pintar en cada render
// de App, por ejemplo al mover el deslizador de peso.
const lastFit = new WeakMap<HTMLElement, string>();

// Alto de una fila: el min-height de .topbar en App.css, leído del estilo
// calculado para no repetir aquí el número. Si al medir la barra mide
// más, es que el plegado completo no ha bastado y ha pasado a dos filas
// (data-collapse~="tabs" con flex-wrap: wrap), no que su contenido sea alto
// por otro motivo.
function rowHeight(bar: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(bar).minHeight);
}

// Dónde acaba la barra, relativo al documento (revisión de la Task 2), para
// lo que se coloque con position: fixed justo debajo de ella. La barra
// está arriba del todo, así que su sitio es el de la página sin desplazar.
// getBoundingClientRect() lo da respecto a la ventana visible, que cambia
// al hacer scroll, y window.scrollY lo pasa al documento. Es la forma
// general: no depende de qué elemento sea el offsetParent.
function barBottom(bar: HTMLElement): number {
  return bar.getBoundingClientRect().bottom + window.scrollY;
}

// Mide la barra y aplica el menor nivel de compactación que cabe en una
// fila (el cálculo en sí, sin DOM, vive en logic/topBarFit.ts: aquí solo
// el envoltorio que toca el elemento real). Salvo con force (al cargar una
// fuente), si ni el ancho ni el contenido han cambiado desde la última
// medida (fitSignature), no toca nada, ni siquiera los atributos: la barra
// se vuelve a pintar con cada render de App. Mientras mide, data-measuring
// (App.css) oculta las etiquetas
// emergentes: si una pestaña de síntesis tiene el foco del teclado, su
// propia etiqueta no debe inflar scrollWidth en ningún nivel que se
// pruebe. Tras aplicar un nivel nuevo: data-wrapped se activa solo si de
// verdad ha pasado a dos filas (App.css usa data-collapse~="tabs" para
// plegar y data-wrapped para el aire vertical entre filas -- no son lo
// mismo: a veces todo plegado sigue cabiendo en una fila), y se quita
// antes de medir el alto, porque su relleno lo aumenta. Por último se
// publica dónde acaba la barra en --topbar-bottom, para colocar algo justo
// debajo y no a una distancia fija: la altura cambia con el tema, el zoom
// o una segunda fila plegada. Hoy no la lee nadie: los avisos flotantes,
// que la usaban, pasaron abajo a la derecha (D4 de
// docs/decisiones-diseno.md).
function refit(bar: HTMLElement | null, force = false) {
  if (!bar) return;
  if (!force && lastFit.get(bar) === fitSignature(bar)) return;
  bar.dataset.measuring = "";
  // Ya se sabe que hay que medir: sin firma anterior y con force.
  fitTopBar(bar, undefined, true);
  delete bar.dataset.measuring;
  lastFit.set(bar, fitSignature(bar));
  bar.removeAttribute("data-wrapped");
  bar.toggleAttribute("data-wrapped", bar.offsetHeight > rowHeight(bar));
  document.documentElement.style.setProperty("--topbar-bottom", `${barBottom(bar)}px`);
}

export function TopBar({ tabs, onImport, context = null, importRef }: TopBarProps) {
  const barRef = useRef<HTMLElement>(null);
  // Pestaña que recibe el foco tras cerrar una síntesis (tabAfterClosing):
  // el botón que lo tenía desaparece en el render siguiente.
  const focusAfterClose = useRef<string | null>(null);

  // Tras cada render, con el contenido nuevo (pestañas, atlas, estado...):
  // se vuelve a medir la barra y, si se acaba de cerrar una pestaña, se
  // enfoca la que le toca. preventScroll: el botón que recibe el foco ya
  // está a la vista, no hay que desplazar la página hacia él.
  useLayoutEffect(() => {
    const bar = barRef.current;
    refit(bar);
    const id = focusAfterClose.current;
    if (!bar || id === null) return;
    focusAfterClose.current = null;
    [...bar.querySelectorAll<HTMLButtonElement>(".topbar__tab-btn")]
      .find((button) => button.dataset.tabId === id)
      ?.focus({ preventScroll: true });
  });

  // ...y cuando cambia el ancho de la ventana o termina de cargar una
  // fuente, que cambia lo que mide cada texto. loadingdone cubre también
  // las fuentes que se cargan tarde, al usarse por primera vez. Se observa
  // el contenedor, no la propia barra: aplicar un nivel puede cambiar la
  // altura de la barra (la segunda fila de data-collapse~="tabs"), y
  // observarla a ella misma dispararía "ResizeObserver loop completed
  // with undelivered notifications". En el espacio de trabajo (altura
  // fija, 100svh) esto evita el aviso del todo, porque el alto del
  // contenedor no depende del de la barra; en las demás vistas (.app
  // crece con su contenido) el contenedor sí sigue el alto de la barra,
  // así que el aviso podría saltar alguna vez: solo cuando aplicar un nivel
  // cambia ese alto, al pasar de una fila a dos o al revés. Raro, porque
  // fuera de la vista Atlas la barra no lleva el contexto de datos y casi
  // nunca necesita dos filas.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let cancelled = false;
    const onFontsChange = () => refit(bar, true);
    const observer = new ResizeObserver(() => refit(bar));
    observer.observe(bar.parentElement ?? bar);
    const fonts = document.fonts;
    void fonts?.ready.then(() => {
      if (!cancelled) onFontsChange();
    });
    fonts?.addEventListener("loadingdone", onFontsChange);
    return () => {
      cancelled = true;
      observer.disconnect();
      fonts?.removeEventListener("loadingdone", onFontsChange);
    };
  }, []);

  const closeTab = (tab: TopBarTab) => {
    focusAfterClose.current = tabAfterClosing(tabs, tab.id);
    tab.onClose?.();
  };

  return (
    <header ref={barRef} className="topbar">
      <div className="topbar__brand">
        <Logo />
        <span className="topbar__name">NeuroGraph</span>
        <span className="topbar__stage">alfa</span>
      </div>
      {/* Cada pestaña cambia la pantalla entera, como una página: es una
          navegación con aria-current, no un tablist. Un tablist no admite
          el botón de cerrar de las síntesis junto a su pestaña. data-tip
          es la etiqueta que App.css muestra con el foco del teclado cuando
          la pestaña está plegada. */}
      <nav className="topbar__tabs" aria-label="Vistas">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`topbar__tab${tab.active ? " topbar__tab--active" : ""}${tab.onClose ? " topbar__tab--closable" : ""}`}
          >
            <button
              type="button"
              className="topbar__tab-btn"
              data-tab-id={tab.id}
              aria-current={tab.active ? "page" : undefined}
              title={tab.title ?? tab.label}
              data-tip={tab.title ?? tab.label}
              onClick={tab.onSelect}
            >
              <Icon name={tab.icon} />
              <span className="topbar__tab-label">{tab.label}</span>
            </button>
            {tab.onClose && (
              <button
                type="button"
                className="topbar__tab-close"
                aria-label={tab.closeLabel ?? `Cerrar ${tab.label}`}
                title={tab.closeLabel ?? `Cerrar ${tab.label}`}
                onClick={() => closeTab(tab)}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        ))}
      </nav>
      <div className="topbar__end">
        {context}
        <button
          ref={importRef}
          type="button"
          className="topbar__import"
          title="Importar una síntesis de IA"
          data-tip="Importar una síntesis de IA"
          onClick={onImport}
        >
          <Icon name="upload" />
          <span className="topbar__import-label">Importar</span>
        </button>
        <SettingsMenu />
      </div>
    </header>
  );
}

// Discriminada por kind: solo "real" tiene cifras, así que no se puede
// omitirlas por descuido (revisión de la Task 2).
type DataStatusProps =
  | { kind: "real"; regionCount: number; connectionCount: number }
  | { kind: "demo" }
  | { kind: "loading" };

// El aviso de siempre de los datos de demostración (antes, la etiqueta
// DATOS SINTÉTICOS · SOLO ILUSTRATIVOS y su texto emergente). Va entero en
// el title; el texto oculto para lectores de pantalla usa una frase más
// corta (dataStatusDetail).
const DEMO_DATA_HELP =
  "Datos sintéticos · solo ilustrativos. La API no respondió, o este atlas aún no tiene datos — revisa que el backend esté en marcha (docker compose up -d en desarrollo).";

// Detalle de las cifras o el aviso, en dos versiones: `visible` (para el
// texto a la vista y el title, con los miles agrupados por formatCount) y
// `hidden` (para el lector de pantalla, con los dígitos seguidos -- un
// espacio duro en medio de un número hace que algunas voces lo troceen,
// "64" pausa "620", en vez de decir "sesenta y cuatro mil620"). null en
// "loading": no hay nada que detallar todavía.
function dataStatusDetail(props: DataStatusProps): { visible: string; hidden: string } | null {
  switch (props.kind) {
    case "real":
      return {
        visible: `${formatCount(props.regionCount)} regiones · ${formatCount(props.connectionCount)} conexiones`,
        hidden: `${props.regionCount} regiones · ${props.connectionCount} conexiones`,
      };
    case "demo":
      // Neutro sobre la causa: "la API no respondió" sería falso si la
      // API sí respondió pero el atlas aún no tiene datos (el title, con
      // el aviso completo de siempre, sí distingue los dos casos).
      return { visible: DEMO_DATA_HELP, hidden: "datos sintéticos, solo ilustrativos" };
    case "loading":
      return null;
  }
}

// Estado de los datos (spec 5.1, punto 4): un punto de color con «Datos
// reales» o «Datos de demostración», siempre a la vista en la vista Atlas
// (sección 24: nunca se confunde lo real con lo ilustrativo). Si la barra
// no cabe, «Datos reales» se queda en su punto; «Datos de demostración»
// nunca, porque es un aviso. La etiqueta emergente dice qué es y da las
// cifras, y el texto oculto lo lee a los lectores de pantalla. Es una
// región role="status": al cambiar de atlas, el cambio se anuncia.
export function DataStatus(props: DataStatusProps) {
  const { kind } = props;
  const text = kind === "real" ? "Datos reales" : kind === "demo" ? "Datos de demostración" : "Cargando…";
  const detail = dataStatusDetail(props);
  const title = kind === "real" ? `${text} · ${detail?.visible}` : (detail?.visible ?? undefined);
  return (
    <span className={`data-status data-status--${kind}`} role="status" title={title}>
      <span className="data-status__dot" aria-hidden="true" />
      <span className="data-status__text">{text}</span>
      {detail && <span className="visually-hidden">: {detail.hidden}</span>}
    </span>
  );
}
