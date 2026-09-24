import { useEffect, useState, type ReactNode } from "react";
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
import { DEMO_CONNECTIONS, DEMO_NODES } from "./data/demo";
import { fetchNetworkSources, fetchRealConnections, fetchRealNodes, type NetworkSourceSummary } from "./data/api";
import { NETWORK_SOURCE_LABELS } from "./theme/networks";
import { pickAndReadSynthesisFile, type PickedSynthesisFile } from "./logic/synthesisImport";
import { validateSynthesisFile } from "./logic/synthesisValidation";
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
  const [networkSourceError, setNetworkSourceError] = useState<string | null>(null);

  // Pestañas de síntesis de IA (decisión 71): cada una guarda su propio
  // resultado YA VALIDADO y congelado en el momento de importar -- no
  // dependen del atlas/fuente de datos activos en la vista principal, así
  // que cambiar de atlas en "Un atlas" nunca invalida una pestaña de
  // síntesis ya abierta. Se pueden cerrar en cualquier momento (son
  // "temporales" de verdad: cerrarlas no borra ni modifica ningún dato
  // real de NeuroGraph, solo quita la pestaña).
  const [synthesisTabs, setSynthesisTabs] = useState<{ tabId: string; validated: ValidatedSynthesis }[]>([]);
  const [activeSynthesisTabId, setActiveSynthesisTabId] = useState<string | null>(null);
  const [synthesisImportError, setSynthesisImportError] = useState<string | null>(null);

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
          setNetworkSourceError(`No se pudo cargar la clasificación '${networkSource}' (${message}).`);
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
    setNetworkSourceError(null);
    setSource({ kind: "loading" });
  }

  const sourcesForAtlas = networkSources?.atlasId === selectedAtlasId ? networkSources.items : [];
  const defaultNetworkSource = sourcesForAtlas.find((s) => s.isDefault)?.source ?? null;
  // Clasificación de los nodos que SE ESTÁN MOSTRANDO (no la recién
  // elegida si todavía está cargando): es la que necesita Brain3D.
  const shownNetworkSource = source.kind === "real" ? (source.networkSource ?? defaultNetworkSource) : null;
  const networkSourcePending = source.kind === "real" && source.networkSource !== networkSource;

  const selectedAtlas = ATLASES.find((a) => a.id === selectedAtlasId)!;

  // Importar síntesis de IA (decisión 71): abre el selector nativo de
  // archivos (frontend/src/logic/synthesisImport.ts), y revalida el
  // contenido contra las regiones REALMENTE cargadas ahora mismo
  // (frontend/src/logic/synthesisValidation.ts) -- nunca se confía en
  // que el archivo ya viniera bien resuelto, aunque quien lo generó ya
  // haya usado la herramienta MCP search_region para construirlo.
  async function handleImportSynthesis() {
    setSynthesisImportError(null);
    let picked: PickedSynthesisFile | null;
    try {
      picked = await pickAndReadSynthesisFile();
    } catch (e) {
      setSynthesisImportError(`No se pudo abrir el selector de archivos: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (picked === null) {
      // La usuaria cerró el diálogo sin elegir nada -- no es un error.
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(picked.content);
    } catch {
      setSynthesisImportError(`'${picked.path}' no contiene un JSON válido.`);
      return;
    }
    if (source.kind !== "real") {
      setSynthesisImportError(
        "No se puede importar una síntesis de IA ahora mismo: no hay datos reales cargados contra los que " +
          "verificar sus regiones (estás viendo datos sintéticos, o la API todavía no respondió).",
      );
      return;
    }
    const result = validateSynthesisFile(raw, selectedAtlasId, source.nodes);
    if (!result.ok) {
      setSynthesisImportError(result.errors.join("\n"));
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

  const atlasSelector = (
    <label className="atlas-selector">
      Atlas:{" "}
      <select value={selectedAtlasId} onChange={(e) => handleChangeAtlas(e.target.value)}>
        {ATLASES.map((atlas) => (
          <option key={atlas.id} value={atlas.id}>
            {atlas.label}
          </option>
        ))}
      </select>
    </label>
  );

  // Selector de clasificación de red (decisión 73): solo si el atlas tiene
  // más de una cargada. Cambia la red de cada región en TODAS las vistas a
  // la vez (connectograma, hemisferios, filtros, cerebro 3D).
  const networkSourceSelector =
    source.kind === "real" && sourcesForAtlas.length > 1 ? (
      <label className="atlas-selector">
        Redes:{" "}
        <select
          value={networkSource ?? defaultNetworkSource ?? ""}
          onChange={(e) => {
            setNetworkSourceError(null);
            setNetworkSource(e.target.value === defaultNetworkSource ? null : e.target.value);
          }}
        >
          {sourcesForAtlas.map((s) => (
            <option key={s.source} value={s.source}>
              {NETWORK_SOURCE_LABELS[s.source] ?? s.source} — {s.regionCount} de {source.nodes.length} regiones
              {s.isDefault ? " (por defecto)" : ""}
            </option>
          ))}
        </select>
        {networkSourcePending && " cargando…"}
      </label>
    ) : null;

  const viewToggle = (
    <nav className="view-toggle">
      <button
        type="button"
        className={view === "atlas" ? "view-toggle__btn view-toggle__btn--active" : "view-toggle__btn"}
        onClick={() => setView("atlas")}
      >
        Un atlas
      </button>
      <button
        type="button"
        className={view === "species" ? "view-toggle__btn view-toggle__btn--active" : "view-toggle__btn"}
        onClick={() => setView("species")}
      >
        Comparar especies
      </button>
      <button
        type="button"
        className={view === "tractography" ? "view-toggle__btn view-toggle__btn--active" : "view-toggle__btn"}
        onClick={() => setView("tractography")}
      >
        Tractografía 3D
      </button>
      <button
        type="button"
        className={view === "tractography-nodes" ? "view-toggle__btn view-toggle__btn--active" : "view-toggle__btn"}
        onClick={() => setView("tractography-nodes")}
      >
        Nodos de tractografía
      </button>
      {/* Pestañas de síntesis de IA ya abiertas (decisión 71) -- closable,
          nunca se pierden al cambiar a otra vista, solo al cerrarlas
          explícitamente con el "×". */}
      {synthesisTabs.map(({ tabId, validated }) => (
        <button
          key={tabId}
          type="button"
          className={
            view === "synthesis" && activeSynthesisTabId === tabId
              ? "view-toggle__btn view-toggle__btn--active"
              : "view-toggle__btn"
          }
          onClick={() => {
            setActiveSynthesisTabId(tabId);
            setView("synthesis");
          }}
          title={`Síntesis de IA: ${validated.file.function}`}
        >
          🧪 {validated.file.function}
          <span
            className="synthesis-tab-close"
            role="button"
            aria-label={`Cerrar pestaña de síntesis "${validated.file.function}"`}
            onClick={(e) => {
              e.stopPropagation();
              closeSynthesisTab(tabId);
            }}
          >
            ×
          </span>
        </button>
      ))}
      <button type="button" className="synthesis-import-btn" onClick={handleImportSynthesis}>
        Importar síntesis de IA…
      </button>
    </nav>
  );

  const synthesisImportBanner = synthesisImportError ? (
    <p className="synthesis-import-error">{synthesisImportError}</p>
  ) : null;

  // Barra superior compacta (decisión 74, 24/09/2026): antes la cabecera
  // ocupaba ~190 px en cinco filas centradas (título grande, pestañas,
  // atlas, redes, etiqueta de datos); ahora es una sola franja. La
  // etiqueta de DATOS REALES / SINTÉTICOS sigue siempre visible (sección
  // 24: nunca se confunde lo real con lo ilustrativo); su explicación
  // larga pasa al texto emergente.
  const renderHeader = (controls: ReactNode = null) => (
    <>
      <header className="topbar">
        <span className="topbar__brand">NeuroGraph</span>
        {viewToggle}
        {controls && <div className="topbar__controls">{controls}</div>}
      </header>
      {synthesisImportBanner}
      {networkSourceError && <p className="synthesis-import-error">{networkSourceError}</p>}
    </>
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
            Esta pestaña de síntesis ya no existe (se cerró). Elige otra pestaña o importa una nueva con "Importar
            síntesis de IA…".
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
            {atlasSelector}
            <span className="demo-badge">Cargando…</span>
          </>,
        )}
      </div>
    );
  }

  const badge =
    source.kind === "real" ? (
      <span
        className="real-badge"
        title={`Datos reales de la base de datos · ${selectedAtlas.label} · ${source.nodes.length} regiones, ${source.connections.length} conexiones`}
      >
        DATOS REALES · {source.nodes.length} regiones · {source.connections.length} conexiones
      </span>
    ) : (
      <span
        className="demo-badge"
        title="La API no respondió, o este atlas aún no tiene datos — revisa que el backend esté en marcha (docker compose up -d en desarrollo)"
      >
        DATOS SINTÉTICOS · SOLO ILUSTRATIVOS
      </span>
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
          {atlasSelector}
          {networkSourceSelector}
          {badge}
        </>,
      )}
      <div className={`workspace${filtersCollapsed ? " workspace--filters-collapsed" : ""}`}>
        <div className="ws-filters">
          {filtersCollapsed ? (
            <button
              type="button"
              className="ws-filters__expand"
              title="Desplegar el panel de filtros"
              onClick={() => setFiltersCollapsed(false)}
            >
              Filtros »
            </button>
          ) : (
            <FilterPanel nodes={source.nodes} onCollapse={() => setFiltersCollapsed(true)} />
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

// Marco de cada vista del espacio de trabajo (decisión 74). En miniatura,
// una capa transparente encima recoge el clic para ampliarla -- así un
// clic en la miniatura nunca selecciona por accidente una región que
// apenas se ve; seleccionar se hace en la vista grande.
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
  return (
    <section className={`ws-view ${isMain ? "ws-view--main" : "ws-view--thumb"}`} style={{ gridArea: area }}>
      <div className="ws-view__header">
        <h2>{title}</h2>
        {!isMain && <span className="ws-view__enlarge-hint">⤢ ampliar</span>}
      </div>
      <div className="ws-view__body">{children}</div>
      {!isMain && (
        <button
          type="button"
          className="ws-view__overlay"
          title={`Ver ${title} en grande`}
          aria-label={`Ver ${title} en grande`}
          onClick={() => onEnlarge(id)}
        />
      )}
    </section>
  );
}
