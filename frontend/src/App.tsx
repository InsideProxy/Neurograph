import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Connectogram } from "./components/Connectogram";
import { Brain3D } from "./components/Brain3D";
import { Hemisferios } from "./components/Hemisferios";
import { FilterPanel } from "./components/FilterPanel";
import { DetailPanel } from "./components/DetailPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SpeciesComparisonPanel } from "./components/SpeciesComparisonPanel";
import { Tractography3D } from "./components/Tractography3D";
import { TractographyNodes3D } from "./components/TractographyNodes3D";
import { FunctionSynthesisTab } from "./components/FunctionSynthesisTab";
import { DataContextMenu } from "./components/DataContextMenu";
import { DataStatus, TopBar, type TopBarTab } from "./components/TopBar";
import { Icon } from "./components/Icon";
import { ToastRegion } from "./components/Toast";
import { HistoryButtons } from "./components/HistoryButtons";
import { useHistoryShortcuts } from "./components/useHistoryShortcuts";
import { focusRegionSearch, useRegionSearchShortcut } from "./components/useRegionSearchShortcut";
import { DEMO_CONNECTIONS, DEMO_NODES } from "./data/demo";
import { fetchNetworkSources, fetchRealConnections, fetchRealNodes, type NetworkSourceSummary } from "./data/api";
import { atlasShortLabel, networkSourceLabel, networkSourceOptionLabel, networkSourceShortLabel } from "./logic/dataContext";
import { pickAndReadSynthesisFile, type PickedSynthesisFile } from "./logic/synthesisImport";
import { validateSynthesisFile } from "./logic/synthesisValidation";
import { IMPORT_DESKTOP_ONLY_MESSAGE, runInDesktop } from "./logic/desktopOnly";
import { dismissToast, showToast, type ToastContent, type ToastEntry } from "./logic/toastQueue";
import { countConnections, type ConnectionCounts } from "./logic/filterCounts";
import { stepNotice } from "./logic/historyStep";
import { useFiltersStore } from "./state/filters";
import { resetHistory, undo, useHistoryStore } from "./state/history";
import type { GraphConnection, GraphNode } from "./types/domain";
import type { ValidatedSynthesis } from "./types/synthesis";
import "./App.css";

// Fuente de datos activa. "real" y "demo" nunca se mezclan en la misma
// vista (sección 24): si la API no responde, o responde pero la base de
// datos aún no tiene nada, se cae por completo a los datos de
// demostración, nunca a una combinación de ambos.
type DataSource =
  | { kind: "loading" }
  // `networkSource`: clasificación de red con la que vienen estos nodos
  // (null = la original de cada atlas) -- decisión 73.
  | { kind: "real"; nodes: GraphNode[]; connections: GraphConnection[]; networkSource: string | null }
  | { kind: "demo"; nodes: GraphNode[]; connections: GraphConnection[] };

// Cada atlas real cargado hasta ahora cuenta una historia distinta:
// HCP-MMP1.0 tiene redes funcionales (Cole-Anticevic) pero ninguna
// conexión todavía; Brainnetome tiene conectividad estructural real pero
// ninguna red funcional calculada todavía; Gordon 333 trae sus propias
// 12 redes (no las de Cole-Anticevic: incluso cuando coinciden en
// nombre, como "Default" o "Visual", son dos clasificaciones distintas
// -- el backend y theme/networks.ts las distinguen con una clave
// `<fuente>.<red>`, ver riesgo 13 de docs/analisis-arquitectura.md);
// el subcórtex del HCP son solo 19
// estructuras anatómicas, sin red ni conexión todavía. Mostrar dos
// atlas a la vez sería mezclar sus nodos (que ocupan el mismo espacio
// físico del cerebro dos veces, una por cada parcelación) — así que se
// elige uno u otro, nunca varios superpuestos.
interface AtlasOption {
  id: string;
  label: string;
}

const ATLASES: AtlasOption[] = [
  { id: "atlas.human.hcp.mmp1_0", label: "HCP-MMP1.0 — 360 regiones, redes funcionales" },
  { id: "atlas.human.brainnetome.bna_246", label: "Brainnetome — 246 regiones, conectividad estructural" },
  { id: "atlas.human.gordon333.cortex", label: "Gordon 333 — 333 regiones corticales, redes propias del atlas" },
  { id: "atlas.human.hcp.subcortex_grayordinates", label: "Subcórtex HCP — 19 regiones (amígdala, tálamo, cerebelo...)" },
];

// Vista activa (decisión 38, 01/09/2026): "un atlas" es la vista
// original (connectograma + hemisferios + cerebro 3D de UNA especie a
// la vez); "comparar especies" es el nuevo panel que muestra las tres
// imágenes reales de `GET /render/species/*` dentro de la propia
// ventana. Nunca se mezclan en la misma pantalla -- son dos preguntas
// distintas (sección 24: nunca presentar cosas de naturaleza distinta
// como si fueran una sola vista).
// "synthesis" (decisión 71, 11/09/2026) es una pestaña temporal más:
// convive con las demás en el mismo interruptor de vista (nunca
// superpuesta a otra, mismo criterio de "una pregunta a la vez" que el
// resto de vistas), pero puede haber VARIAS abiertas a la vez -- cuál de
// ellas se ve depende de `activeSynthesisTabId`, no de `view` por sí solo.
type View = "atlas" | "species" | "tractography" | "tractography-nodes" | "synthesis";

// Orígenes de los avisos (D4; spec 5.6): un aviso nuevo sustituye al
// anterior del mismo origen.
const IMPORT_TOAST = "importar";
const NETWORK_TOAST = "redes";
// Aviso con «Deshacer» (D4; spec 5.7): se va solo a los 8 s.
const UNDO_TOAST = "deshacer";
const UNDO_NOTICE_MS = 8000;

const NO_CONNECTION_COUNTS: ConnectionCounts = {
  byType: { structural: 0, functional: 0, effective: 0 },
  visible: 0,
  loaded: 0,
};

export default function App() {
  const [view, setView] = useState<View>("atlas");
  // Espacio de trabajo (decisión 74): qué vista va en grande, y si el
  // panel de filtros está plegado. Por defecto, el cerebro 3D en grande.
  const [mainView, setMainView] = useState<WorkspaceViewId>("brain3d");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [selectedAtlasId, setSelectedAtlasId] = useState(ATLASES[0].id);
  const [source, setSource] = useState<DataSource>({ kind: "loading" });
  // Clasificación de red elegida (decisión 73): null = la original del
  // atlas. Las disponibles salen de la API (GET /regions/network-sources),
  // nunca de una lista escrita a mano; si esa consulta falla (p. ej. un
  // backend anterior), simplemente no hay selector.
  const [networkSource, setNetworkSource] = useState<string | null>(null);
  const [networkSources, setNetworkSources] = useState<{ atlasId: string; items: NetworkSourceSummary[] } | null>(
    null,
  );

  // Pestañas de síntesis de IA (decisión 71): cada una guarda su propio
  // resultado YA VALIDADO y congelado en el momento de importar -- no
  // dependen del atlas/fuente de datos activos en la vista principal, así
  // que cambiar de atlas en "Un atlas" nunca invalida una pestaña de
  // síntesis ya abierta. Se pueden cerrar en cualquier momento (son
  // "temporales" de verdad: cerrarlas no borra ni modifica ningún dato
  // real de NeuroGraph, solo quita la pestaña).
  const [synthesisTabs, setSynthesisTabs] = useState<{ tabId: string; validated: ValidatedSynthesis }[]>([]);
  const [activeSynthesisTabId, setActiveSynthesisTabId] = useState<string | null>(null);
  // Avisos flotantes (D4 de docs/decisiones-diseno.md; spec 5.6). Sustituyen
  // a las dos franjas de error de antes: la de importar una síntesis y la
  // de cambiar la clasificación de redes, que se quedan hasta que se
  // cierran. Hay un tercer origen, el aviso con «Deshacer» (spec 5.7), que
  // se va solo.
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const showNotice = (key: string, content: ToastContent) => setToasts((queue) => showToast(queue, key, content));
  // Fuera de la vista Atlas, el aviso con «Deshacer» se retira: tras usarlo,
  // el foco iría a ↶ o al título de la vista grande, que allí no están, y
  // caería en la página. Fuera de Atlas no cambian ni la selección ni los
  // filtros, así que no puede salir otro. Se ajusta al pintar con la vista
  // nueva, sin un efecto (el patrón de React para ajustar un estado cuando
  // cambia otro).
  const [viewOfToasts, setViewOfToasts] = useState(view);
  if (viewOfToasts !== view) {
    setViewOfToasts(view);
    if (view !== "atlas") setToasts((queue) => dismissToast(queue, UNDO_TOAST));
  }
  // Al cerrar el último aviso, el foco vuelve a «Importar» (ToastRegion).
  const importButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNetworkSources(selectedAtlasId)
      .then((items) => {
        if (!cancelled) setNetworkSources({ atlasId: selectedAtlasId, items });
      })
      .catch(() => {
        if (!cancelled) setNetworkSources({ atlasId: selectedAtlasId, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAtlasId]);

  // Cambiar de clasificación NO vacía la vista mientras llegan los nodos
  // nuevos (se sigue viendo la anterior, con un aviso de "cargando"); solo
  // cambiar de atlas pasa por el estado "loading" (ver handleChangeAtlas).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRealNodes(selectedAtlasId, networkSource ?? undefined),
      fetchRealConnections(selectedAtlasId),
    ])
      .then(([nodes, connections]) => {
        if (cancelled) return;
        if (nodes.length === 0) {
          // La API respondió pero la base de datos aún no tiene regiones
          // de este atlas dadas de alta: no es un error, solo no hay
          // nada real que mostrar todavía.
          setSource({ kind: "demo", nodes: DEMO_NODES, connections: DEMO_CONNECTIONS });
          return;
        }
        setSource({ kind: "real", nodes, connections, networkSource });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (networkSource !== null) {
          // Falló solo el cambio de clasificación: se avisa y se vuelve a
          // la original, nunca se cae a datos de demostración por esto.
          const message = err instanceof Error ? err.message : "error desconocido";
          // setToasts y no showNotice: un setter de estado no es dependencia del efecto.
          // En «Detalles», el error entero, con su tipo (String), y si no es
          // un Error, el texto de siempre.
          setToasts((queue) =>
            showToast(queue, NETWORK_TOAST, {
              tone: "error",
              message: `No se pudo cargar la clasificación de redes «${networkSourceShortLabel(networkSource)}». Se vuelve a la clasificación por defecto del atlas.`,
              details: `No se pudo cargar la clasificación '${networkSource}' (${err instanceof Error ? String(err) : message}).`,
            }),
          );
          setNetworkSource(null);
          return;
        }
        setSource({ kind: "demo", nodes: DEMO_NODES, connections: DEMO_CONNECTIONS });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAtlasId, networkSource]);

  function handleChangeAtlas(atlasId: string) {
    setSelectedAtlasId(atlasId);
    setNetworkSource(null);
    setToasts((queue) => dismissToast(queue, NETWORK_TOAST));
    setSource({ kind: "loading" });
    // D4 (spec 5.7): el atlas nuevo empieza con el historial de deshacer
    // vacío. App no vacía la selección al cambiar de atlas (los ids del
    // anterior se quedan en el store y las vistas los ignoran), así que la
    // instantánea de partida es la selección tal como queda.
    resetHistory();
  }

  const sourcesForAtlas = networkSources?.atlasId === selectedAtlasId ? networkSources.items : [];
  const defaultNetworkSource = sourcesForAtlas.find((s) => s.isDefault)?.source ?? null;
  // Clasificación de los nodos que SE ESTÁN MOSTRANDO (no la recién
  // elegida si todavía está cargando): es la que necesita Brain3D.
  const shownNetworkSource = source.kind === "real" ? (source.networkSource ?? defaultNetworkSource) : null;
  const networkSourcePending = source.kind === "real" && source.networkSource !== networkSource;

  // Recuentos del panel de filtros (D4 de docs/decisiones-diseno.md; spec
  // 5.3): por tipo de conectividad con los demás filtros, y cuántas
  // conexiones pasan todos. Se calculan aquí porque el panel solo recibe
  // los nodos.
  const hiddenNetworks = useFiltersStore((state) => state.hiddenNetworks);
  const hiddenConnectionTypes = useFiltersStore((state) => state.hiddenConnectionTypes);
  const minWeight = useFiltersStore((state) => state.minWeight);
  const connectionCounts = useMemo(
    () =>
      source.kind === "loading"
        ? NO_CONNECTION_COUNTS
        : countConnections(source.nodes, source.connections, { hiddenNetworks, hiddenConnectionTypes, minWeight }),
    [source, hiddenNetworks, hiddenConnectionTypes, minWeight],
  );

  // Plegar y desplegar Filtros (D4 de docs/decisiones-diseno.md): el foco
  // pasa al botón que sustituye al que se ha pulsado.
  const filtersRef = useRef<HTMLDivElement>(null);
  const focusFiltersToggle = useRef(false);
  useEffect(() => {
    if (!focusFiltersToggle.current) return;
    focusFiltersToggle.current = false;
    filtersRef.current
      ?.querySelector<HTMLButtonElement>(filtersCollapsed ? ".ws-filters__expand" : ".filters__collapse")
      ?.focus();
  }, [filtersCollapsed]);
  const toggleFilters = (collapsed: boolean) => {
    focusFiltersToggle.current = true;
    setFiltersCollapsed(collapsed);
  };

  // Deshacer y rehacer con el teclado, en la vista Atlas (D4 de
  // docs/decisiones-diseno.md; spec 5.7).
  useHistoryShortcuts(view === "atlas");

  // Regiones cargadas, para el aviso con «Deshacer» (más abajo): las lee de
  // aquí su suscripción al historial, que es una sola. Va antes del efecto
  // que vacía el historial, así que este ya las encuentra al día.
  const loadedIdsRef = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    loadedIdsRef.current = new Set(source.kind === "loading" ? [] : source.nodes.map((node) => node.id));
  }, [source]);

  // Con otra clasificación de redes, las redes guardadas en el historial
  // dejan de valer (spec 5.7). Se vacía cuando llega, no al elegirla:
  // mientras carga se sigue viendo la anterior, y si falla, se queda.
  const loadedNetworkSource = source.kind === "real" ? source.networkSource : null;
  useEffect(() => {
    resetHistory();
  }, [loadedNetworkSource]);

  // Aviso con «Deshacer» (spec 5.7): sale cuando un paso quita dos o más
  // regiones de la selección (logic/historyStep.ts, stepNotice). Su texto lo
  // anuncia la región viva de ToastRegion, sin mover el foco. Se va solo a
  // los 8 s, salvo mientras tiene el ratón encima o el foco, y con el
  // siguiente cambio del historial, también cuando se vacía (resetHistory)
  // al cambiar de atlas o de clasificación, o al caer de los datos reales a
  // los de demostración: su «Deshacer» ya no tendría nada que deshacer.
  // Por eso la suscripción es una sola, desde el montaje, y no una por cada
  // `source`: en React 19 las bajas de los efectos corren antes que las
  // altas, así que el efecto de arriba vaciaría el historial entre la baja
  // de la suscripción anterior y el alta de la nueva, y nadie retiraría el
  // aviso.
  const undoButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Tras el «Deshacer» del aviso, el foco va al botón ↶ si se ve (con
    // Filtros plegado no está), y si no, al título de la vista grande.
    // Nunca a «Importar».
    const focusAfterUndo = () => {
      const button = undoButtonRef.current;
      if (button && button.getClientRects().length > 0) button.focus();
      else document.querySelector<HTMLElement>(".ws-view--main .ws-view__header h2")?.focus();
    };
    return useHistoryStore.subscribe((state, previous) => {
      if (state.version === previous.version) return;
      const loadedIds = loadedIdsRef.current;
      const notice = state.lastStep && stepNotice(state.lastStep.before, state.lastStep.after, (id) => loadedIds.has(id));
      if (!notice) {
        // Si el foco estaba en el aviso, no se pierde con él.
        if (document.activeElement?.closest(`[data-toast-key="${UNDO_TOAST}"]`)) focusAfterUndo();
        setToasts((queue) => dismissToast(queue, UNDO_TOAST));
        return;
      }
      setToasts((queue) =>
        showToast(queue, UNDO_TOAST, {
          tone: "info",
          polite: true,
          message: notice,
          action: { label: "Deshacer", run: undo },
          autoDismissMs: UNDO_NOTICE_MS,
          stamp: state.version,
          returnFocus: focusAfterUndo,
        }),
      );
    });
  }, []);

  // Ctrl+K (⌘K) lleva al buscador de regiones, en la vista Atlas (D4 de
  // docs/decisiones-diseno.md; spec 5.8). Con Filtros plegado, primero lo
  // despliega, y el foco llega cuando el buscador ya está en la página.
  const focusSearchAfterExpand = useRef(false);
  useEffect(() => {
    if (filtersCollapsed || !focusSearchAfterExpand.current) return;
    focusSearchAfterExpand.current = false;
    focusRegionSearch(filtersRef.current);
  }, [filtersCollapsed]);
  useRegionSearchShortcut(view === "atlas", () => {
    if (!filtersCollapsed) {
      focusRegionSearch(filtersRef.current);
      return;
    }
    focusSearchAfterExpand.current = true;
    setFiltersCollapsed(false);
  });

  const selectedAtlas = ATLASES.find((a) => a.id === selectedAtlasId)!;

  // Importar síntesis de IA (decisión 71): abre el selector nativo de
  // archivos (frontend/src/logic/synthesisImport.ts), y revalida el
  // contenido contra las regiones REALMENTE cargadas ahora mismo
  // (frontend/src/logic/synthesisValidation.ts) -- nunca se confía en
  // que el archivo ya viniera bien resuelto, aunque quien lo generó ya
  // haya usado la herramienta MCP search_region para construirlo.
  async function handleImportSynthesis() {
    setToasts((queue) => dismissToast(queue, IMPORT_TOAST));
    let picked: PickedSynthesisFile | null;
    try {
      // En el navegador (npm run dev) no hay diálogo de Tauri: ni se
      // intenta abrir (D4 de docs/decisiones-diseno.md; spec 5.6).
      const outcome = await runInDesktop(pickAndReadSynthesisFile);
      if (outcome.kind === "browser") {
        showNotice(IMPORT_TOAST, { tone: "info", message: IMPORT_DESKTOP_ONLY_MESSAGE });
        return;
      }
      picked = outcome.value;
    } catch (e) {
      showNotice(IMPORT_TOAST, {
        tone: "error",
        message: "No se pudo abrir o leer el archivo.",
        details: String(e),
      });
      return;
    }
    if (picked === null) {
      // La usuaria cerró el diálogo sin elegir nada -- no es un error.
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(picked.content);
    } catch (e) {
      showNotice(IMPORT_TOAST, {
        tone: "error",
        message: "El archivo elegido no contiene un JSON válido.",
        details: `Archivo: ${picked.path}\n${String(e)}`,
      });
      return;
    }
    if (source.kind !== "real") {
      showNotice(IMPORT_TOAST, {
        tone: "error",
        message:
          "No se puede importar ahora: no hay datos reales cargados contra los que verificar sus regiones " +
          "(estás viendo datos de demostración, o la API todavía no respondió).",
      });
      return;
    }
    const result = validateSynthesisFile(raw, selectedAtlasId, source.nodes);
    if (!result.ok) {
      const problems = result.errors.length === 1 ? "1 problema" : `${result.errors.length} problemas`;
      showNotice(IMPORT_TOAST, {
        tone: "error",
        message: `La síntesis no se ha importado: tiene ${problems}.`,
        details: result.errors.join("\n"),
      });
      return;
    }
    const tabId = `synthesis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSynthesisTabs((prev) => [...prev, { tabId, validated: result.validated }]);
    setActiveSynthesisTabId(tabId);
    setView("synthesis");
  }

  function closeSynthesisTab(tabId: string) {
    setSynthesisTabs((prev) => prev.filter((t) => t.tabId !== tabId));
    if (activeSynthesisTabId === tabId) {
      setActiveSynthesisTabId(null);
      setView("atlas");
    }
  }

  // Contexto de datos de la barra (D4 de docs/decisiones-diseno.md; spec
  // 5.1): listas desplegables en lugar de los <select> nativos, que
  // cortaban el texto. El botón muestra un nombre corto y la lista, las
  // etiquetas completas. Mismo estado y mismos manejadores que antes.
  const atlasMenu = (
    <DataContextMenu
      caption="Atlas"
      valueLabel={atlasShortLabel(selectedAtlas.label)}
      title={selectedAtlas.label}
      options={ATLASES.map((atlas) => ({ value: atlas.id, label: atlas.label }))}
      value={selectedAtlasId}
      onChange={handleChangeAtlas}
    />
  );

  // Selector de clasificación de red (decisión 73): solo si el atlas tiene
  // más de una cargada. Cambia la red de cada región en TODAS las vistas a
  // la vez (connectograma, hemisferios, filtros, cerebro 3D).
  const chosenNetworkSource = networkSource ?? defaultNetworkSource ?? "";
  const networkMenu =
    source.kind === "real" && sourcesForAtlas.length > 1 ? (
      <DataContextMenu
        caption="Redes"
        valueLabel={chosenNetworkSource ? networkSourceShortLabel(chosenNetworkSource) : "—"}
        title={chosenNetworkSource ? networkSourceLabel(chosenNetworkSource) : undefined}
        options={sourcesForAtlas.map((s) => ({
          value: s.source,
          label: networkSourceOptionLabel(s, source.nodes.length),
        }))}
        value={chosenNetworkSource}
        onChange={(value) => {
          setToasts((queue) => dismissToast(queue, NETWORK_TOAST));
          setNetworkSource(value === defaultNetworkSource ? null : value);
        }}
        pending={networkSourcePending}
      />
    ) : null;

  // Pestañas de la barra (D4 de docs/decisiones-diseno.md; spec 5.1): las
  // cuatro vistas y las pestañas de síntesis de IA ya abiertas (decisión
  // 71). Estas nunca se pierden al cambiar de vista; solo se quitan al
  // cerrarlas con su botón.
  const tabs: TopBarTab[] = [
    { id: "atlas", label: "Atlas", icon: "atlas", active: view === "atlas", onSelect: () => setView("atlas") },
    {
      id: "species",
      label: "Comparar especies",
      icon: "species",
      active: view === "species",
      onSelect: () => setView("species"),
    },
    {
      id: "tractography",
      label: "Tractografía 3D",
      icon: "tracts",
      active: view === "tractography",
      onSelect: () => setView("tractography"),
    },
    {
      id: "tractography-nodes",
      label: "Nodos de tractografía",
      icon: "nodes",
      active: view === "tractography-nodes",
      onSelect: () => setView("tractography-nodes"),
    },
    ...synthesisTabs.map(
      ({ tabId, validated }): TopBarTab => ({
        id: tabId,
        label: validated.file.function,
        icon: "synthesis",
        title: `Síntesis de IA: ${validated.file.function}`,
        active: view === "synthesis" && activeSynthesisTabId === tabId,
        onSelect: () => {
          setActiveSynthesisTabId(tabId);
          setView("synthesis");
        },
        onClose: () => closeSynthesisTab(tabId),
        closeLabel: `Cerrar pestaña de síntesis "${validated.file.function}"`,
      }),
    ),
  ];

  // Barra superior (D4 de docs/decisiones-diseno.md; spec 5.1). Sustituye
  // a la franja compacta de la decisión 74 (D1): marca, pestañas con
  // icono, contexto de datos, Importar y Ajustes. El contexto (atlas,
  // redes y la etiqueta de datos reales o de demostración) solo llega en
  // la vista Atlas, y ahí está siempre visible (sección 24: nunca se
  // confunde lo real con lo ilustrativo). Fragment con clave: sin ella,
  // React lo desenvuelve cuando es el único hijo (vista de carga) y la
  // barra se vuelve a montar al cambiar de atlas, con lo que el foco se
  // pierde y el estado de los datos no se anuncia.
  const renderHeader = (context: ReactNode = null) => (
    <Fragment key="barra">
      <TopBar tabs={tabs} context={context} onImport={handleImportSynthesis} importRef={importButtonRef} />
      <ToastRegion
        toasts={toasts}
        onDismiss={(key) => setToasts((queue) => dismissToast(queue, key))}
        onEmptied={() => importButtonRef.current?.focus()}
      />
    </Fragment>
  );

  if (view === "species") {
    return (
      <div className="app">
        {renderHeader()}
        <div className="layout">
          <section className="panel species-panel-wrap">
            <h2>Comparación real entre especies</h2>
            <SpeciesComparisonPanel />
          </section>
        </div>
      </div>
    );
  }

  if (view === "tractography") {
    return (
      <div className="app">
        {renderHeader()}
        <ErrorBoundary
          fallback={
            <p className="canvas-error">
              No se pudo mostrar la tractografía 3D (error inesperado).
              Recarga la página; si se repite, abre la consola del
              navegador (F12 → Console) y dime qué aparece ahí.
            </p>
          }
        >
          <Tractography3D />
        </ErrorBoundary>
      </div>
    );
  }

  if (view === "tractography-nodes") {
    return (
      <div className="app">
        {renderHeader()}
        <ErrorBoundary
          fallback={
            <p className="canvas-error">
              No se pudieron mostrar los nodos de tractografía (error
              inesperado). Recarga la página; si se repite, abre la
              consola del navegador (F12 → Console) y dime qué aparece
              ahí.
            </p>
          }
        >
          <TractographyNodes3D />
        </ErrorBoundary>
      </div>
    );
  }

  if (view === "synthesis") {
    const activeTab = synthesisTabs.find((t) => t.tabId === activeSynthesisTabId);
    return (
      <div className="app">
        {renderHeader()}
        {activeTab ? (
          <FunctionSynthesisTab validated={activeTab.validated} />
        ) : (
          <p className="canvas-error">
            Esta pestaña de síntesis ya no existe (se cerró). Elige otra pestaña o importa una nueva con «Importar»,
            en la barra superior.
          </p>
        )}
      </div>
    );
  }

  if (source.kind === "loading") {
    return (
      <div className="app">
        {renderHeader(
          <>
            <div className="data-context">{atlasMenu}</div>
            <DataStatus kind="loading" />
          </>,
        )}
      </div>
    );
  }

  // Estado de los datos (spec 5.1, punto 4).
  const status =
    source.kind === "real" ? (
      <DataStatus kind="real" regionCount={source.nodes.length} connectionCount={source.connections.length} />
    ) : (
      <DataStatus kind="demo" />
    );

  // Espacio de trabajo "una vista grande + miniaturas" (decisión 74,
  // elegida por la usuaria, 24/09/2026). Antes, las tres vistas iban en
  // filas que se desbordaban: en una pantalla de 1920x1080 el cerebro 3D
  // empezaba a 2176 px de altura (hacía falta bajar dos pantallas y
  // media) y ya no se veía a la vez que el connectograma. Ahora todo cabe
  // en la ventana: filtros a la izquierda (plegables), la vista elegida en
  // grande en el centro, y las otras dos como miniaturas vivas a la
  // derecha, encima del detalle. Hacer clic en una miniatura la amplía.
  //
  // Las tres vistas se montan SIEMPRE en el mismo orden del DOM y solo
  // cambia la zona de la rejilla que ocupan (grid-area): así, al
  // intercambiarlas no se desmontan ni pierden su estado (cámara del 3D,
  // modo de corteza, especie de homología...).
  const areaOf = (v: WorkspaceViewId): string => {
    if (v === mainView) return "main";
    const thumbs = WORKSPACE_VIEWS.filter((w) => w !== mainView);
    return thumbs[0] === v ? "thumb1" : "thumb2";
  };

  return (
    <div className="app app--workspace">
      {renderHeader(
        <>
          <div className="data-context">
            {atlasMenu}
            {networkMenu}
          </div>
          {status}
        </>,
      )}
      <div className={`workspace${filtersCollapsed ? " workspace--filters-collapsed" : ""}`}>
        <div className="ws-filters" ref={filtersRef}>
          {filtersCollapsed ? (
            <button
              type="button"
              className="ws-filters__expand"
              title="Desplegar el panel de filtros"
              aria-label="Desplegar el panel de filtros"
              onClick={() => toggleFilters(false)}
            >
              <Icon name="chevronsRight" />
              <span>Filtros</span>
            </button>
          ) : (
            <FilterPanel
              nodes={source.nodes}
              onCollapse={() => toggleFilters(true)}
              connectionCountsByType={connectionCounts.byType}
              connectionTotals={{ visible: connectionCounts.visible, loaded: connectionCounts.loaded }}
              historyControls={
                <HistoryButtons nodes={source.nodes} connections={source.connections} undoRef={undoButtonRef} />
              }
            />
          )}
        </div>

        <WorkspaceView id="connectogram" area={areaOf("connectogram")} isMain={mainView === "connectogram"} onEnlarge={setMainView}>
          <Connectogram nodes={source.nodes} connections={source.connections} compact={mainView !== "connectogram"} />
        </WorkspaceView>

        <WorkspaceView id="hemispheres" area={areaOf("hemispheres")} isMain={mainView === "hemispheres"} onEnlarge={setMainView}>
          <Hemisferios nodes={source.nodes} connections={source.connections} compact={mainView !== "hemispheres"} />
        </WorkspaceView>

        <WorkspaceView id="brain3d" area={areaOf("brain3d")} isMain={mainView === "brain3d"} onEnlarge={setMainView}>
          <div className="canvas-wrap">
            <ErrorBoundary
              fallback={
                <p className="canvas-error">
                  No se pudo mostrar el cerebro 3D (error inesperado).
                  Recarga la página; si se repite, abre la consola del
                  navegador (F12 → Console) y dime qué aparece ahí.
                </p>
              }
            >
              {/* atlasId solo con datos reales (decisión 72): con datos de
                  demostración nunca se pinta ninguna corteza real. */}
              <Brain3D
                nodes={source.nodes}
                connections={source.connections}
                atlasId={source.kind === "real" ? selectedAtlasId : undefined}
                networkSource={shownNetworkSource ?? undefined}
                compact={mainView !== "brain3d"}
              />
            </ErrorBoundary>
          </div>
        </WorkspaceView>

        <div className="ws-detail">
          <DetailPanel
            nodes={source.nodes}
            connections={source.connections}
            canFetchTracts={source.kind === "real"}
          />
        </div>
      </div>
    </div>
  );
}

type WorkspaceViewId = "connectogram" | "hemispheres" | "brain3d";
const WORKSPACE_VIEWS: WorkspaceViewId[] = ["connectogram", "hemispheres", "brain3d"];
const WORKSPACE_VIEW_TITLES: Record<WorkspaceViewId, string> = {
  connectogram: "Connectograma",
  hemispheres: "Hemisferios",
  brain3d: "Cerebro 3D",
};

// Una línea bajo el título de la vista grande que explica cómo leerla (D4
// de docs/decisiones-diseno.md; spec 5.4). Es un texto fijo: vale con
// cualquier atlas y cualquier selección. El grosor de las líneas del
// connectograma es max(1, peso × 6) px, y en HCP-MMP1.0 ningún peso pasa
// de 0,144: la frase no promete diferencias que no se ven.
const WORKSPACE_VIEW_DESCRIPTIONS: Record<WorkspaceViewId, string> = {
  connectogram:
    "Cada punto del círculo es una región, con el color de su red, y cada línea, una conexión. El grosor solo cambia con pesos mayores que 0.17: por debajo, todas las líneas miden lo mismo.",
  hemispheres:
    "Vista desde arriba: la parte anterior arriba y el hemisferio izquierdo a la izquierda. Verde: conexiones dentro de un hemisferio; rosa: entre los dos.",
  brain3d:
    "Cada región en su posición real y con el color de su red. Con una selección, muestra lo seleccionado y sus conexiones: una región con sus vecinas, varias con las conexiones entre ellas, o una conexión. Arrastra para girar y usa la rueda para acercarte.",
};

// Marco de cada vista del espacio de trabajo (decisión 74, D1). En
// miniatura, una capa transparente encima recoge el clic para ampliarla:
// así un clic en la miniatura nunca selecciona por accidente una región
// que apenas se ve, y seleccionar se hace en la vista grande.
//
// D4 (spec 5.4): la vista grande lleva una línea que explica cómo leerla.
// Las miniaturas llevan un botón visible «Ampliar», que es también el
// camino con el teclado: la capa sale del orden del tabulador. Al
// ampliar con el botón, el foco pasa al título de la vista ampliada, que
// es el mismo componente (las tres vistas nunca se desmontan). Las
// herramientas de cada vista siguen dentro de ella; App.css las coloca a
// la derecha de la cabecera cuando caben.
function WorkspaceView({
  id,
  area,
  isMain,
  onEnlarge,
  children,
}: {
  id: WorkspaceViewId;
  area: string;
  isMain: boolean;
  onEnlarge: (id: WorkspaceViewId) => void;
  children: ReactNode;
}) {
  const title = WORKSPACE_VIEW_TITLES[id];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingWhenMain = useRef(false);

  useEffect(() => {
    if (isMain && focusHeadingWhenMain.current) {
      focusHeadingWhenMain.current = false;
      headingRef.current?.focus();
    }
  }, [isMain]);

  const enlarge = () => {
    focusHeadingWhenMain.current = true;
    onEnlarge(id);
  };

  return (
    <section
      className={`ws-view ${isMain ? "ws-view--main" : "ws-view--thumb"}`}
      data-view={id}
      style={{ gridArea: area }}
      aria-label={title}
    >
      <div className="ws-view__header">
        <div className="ws-view__heading">
          <h2 ref={headingRef} tabIndex={-1}>
            {title}
          </h2>
          {isMain && <p className="ws-view__description">{WORKSPACE_VIEW_DESCRIPTIONS[id]}</p>}
        </div>
        {!isMain && (
          <button
            type="button"
            className="ws-view__enlarge"
            aria-label={`Ampliar ${title}`}
            title={`Ver ${title} en grande`}
            onClick={enlarge}
          >
            <Icon name="expand" size={14} />
            Ampliar
          </button>
        )}
      </div>
      <div className="ws-view__body">{children}</div>
      {!isMain && (
        <button
          type="button"
          className="ws-view__overlay"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => onEnlarge(id)}
        />
      )}
    </section>
  );
}
