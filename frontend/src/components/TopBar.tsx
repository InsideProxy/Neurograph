// Barra superior (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.1): marca, pestañas de vista, contexto de datos (solo en la vista
// Atlas), Importar y el engranaje de Ajustes. Solo presenta: la vista
// activa, las pestañas de síntesis, el atlas elegido y los manejadores
// siguen en App.
import { useEffect, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { formatCount } from "../logic/displayText";
import { collapseAttribute, smallestFittingLevel, tabAfterClosing } from "../logic/topBarFit";
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

// Logotipo de la maqueta (decisión de la usuaria, 24/09/2026; principio 4
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

// Aplica el menor nivel de compactación con el que la barra cabe en una
// fila (logic/topBarFit.ts; cada paso está en App.css). El nivel va en el
// atributo data-collapse, que no es estado de React: medir no provoca otro
// render. Con flex-wrap: nowrap, lo que no cabe sobresale y scrollWidth
// pasa de clientWidth.
function fitTopBar(bar: HTMLElement | null, force = false) {
  if (!bar) return;
  const signature = `${bar.clientWidth}|${bar.innerHTML}`;
  if (!force && lastFit.get(bar) === signature) return;
  const level = smallestFittingLevel((n) => {
    bar.dataset.collapse = collapseAttribute(n);
    return bar.scrollWidth <= bar.clientWidth;
  });
  bar.dataset.collapse = collapseAttribute(level);
  lastFit.set(bar, signature);
}

export function TopBar({ tabs, onImport, context = null, importRef }: TopBarProps) {
  const barRef = useRef<HTMLElement>(null);
  // Pestaña que recibe el foco tras cerrar una síntesis (tabAfterClosing):
  // el botón que lo tenía desaparece en el render siguiente.
  const focusAfterClose = useRef<string | null>(null);

  // Tras cada render, con el contenido nuevo (pestañas, atlas, estado...):
  // se vuelve a medir la barra y, si se acaba de cerrar una pestaña, se
  // enfoca la que le toca.
  useLayoutEffect(() => {
    const bar = barRef.current;
    fitTopBar(bar);
    const id = focusAfterClose.current;
    if (!bar || id === null) return;
    focusAfterClose.current = null;
    [...bar.querySelectorAll<HTMLButtonElement>(".topbar__tab-btn")].find((button) => button.dataset.tabId === id)?.focus();
  });

  // ...y cuando cambia el ancho de la ventana o termina de cargar una
  // fuente, que cambia lo que mide cada texto. loadingdone cubre también
  // las fuentes que se cargan tarde, al usarse por primera vez.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const refit = () => fitTopBar(bar, true);
    const observer = new ResizeObserver(() => fitTopBar(bar));
    observer.observe(bar);
    const fonts = document.fonts;
    void fonts?.ready.then(refit);
    fonts?.addEventListener("loadingdone", refit);
    return () => {
      observer.disconnect();
      fonts?.removeEventListener("loadingdone", refit);
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
              <Icon name={tab.icon} className={tab.icon === "synthesis" ? "icon--synthesis" : undefined} />
              <span className="topbar__tab-label">{tab.label}</span>
            </button>
            {tab.onClose && (
              <button
                type="button"
                className="topbar__tab-close"
                aria-label={tab.closeLabel ?? `Cerrar ${tab.label}`}
                title="Cerrar pestaña"
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

interface DataStatusProps {
  kind: "real" | "demo" | "loading";
  regionCount?: number;
  connectionCount?: number;
}

// El aviso de siempre de los datos de demostración (antes, la etiqueta
// DATOS SINTÉTICOS · SOLO ILUSTRATIVOS y su texto emergente).
const DEMO_DATA_HELP =
  "Datos sintéticos · solo ilustrativos. La API no respondió, o este atlas aún no tiene datos — revisa que el backend esté en marcha (docker compose up -d en desarrollo).";

// Estado de los datos (spec 5.1, punto 4): un punto de color con «Datos
// reales» o «Datos de demostración», siempre a la vista en la vista Atlas
// (sección 24: nunca se confunde lo real con lo ilustrativo). Si la barra
// no cabe, «Datos reales» se queda en su punto; «Datos de demostración»
// nunca, porque es un aviso. La etiqueta emergente dice qué es y da las
// cifras, y el texto oculto lo lee a los lectores de pantalla. Es una
// región role="status": al cambiar de atlas, el cambio se anuncia.
export function DataStatus({ kind, regionCount = 0, connectionCount = 0 }: DataStatusProps) {
  const text = kind === "real" ? "Datos reales" : kind === "demo" ? "Datos de demostración" : "Cargando…";
  const detail =
    kind === "real"
      ? `${formatCount(regionCount)} regiones · ${formatCount(connectionCount)} conexiones`
      : kind === "demo"
        ? DEMO_DATA_HELP
        : null;
  const title = kind === "real" ? `${text} · ${detail}` : (detail ?? undefined);
  return (
    <span className={`data-status data-status--${kind}`} role="status" title={title}>
      <span className="data-status__dot" aria-hidden="true" />
      <span className="data-status__text">{text}</span>
      {detail && <span className="visually-hidden">. {detail}</span>}
    </span>
  );
}
