import { useEffect, useState } from "react";
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
import { fetchRealConnections, fetchRealNodes } from "./data/api";
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
  | { kind: "real"; nodes: GraphNode[]; connections: GraphConnection[] }
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
  const [selectedAtlasId, setSelectedAtlasId] = useState(ATLASES[0].id);
  const [source, setSource] = useState<DataSource>({ kind: "loading" });

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
    setSource({ kind: "loading" });
    Promise.all([fetchRealNodes(selectedAtlasId), fetchRealConnections(selectedAtlasId)])
      .then(([nodes, connections]) => {
        if (cancelled) return;
        if (nodes.length === 0) {
          // La API respondió pero la base de datos aún no tiene regiones
          // de este atlas dadas de alta: no es un error, solo no hay
          // nada real que mostrar todavía.
          setSource({ kind: "demo", nodes: DEMO_NODES, connections: DEMO_CONNECTIONS });
          return;
        }
        setSource({ kind: "real", nodes, connections });
      })
      .catch(() => {
        if (cancelled) return;
        setSource({ kind: "demo", nodes: DEMO_NODES, connections: DEMO_CONNECTIONS });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAtlasId]);

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
      <select value={selectedAtlasId} onChange={(e) => setSelectedAtlasId(e.target.value)}>
        {ATLASES.map((atlas) => (
          <option key={atlas.id} value={atlas.id}>
            {atlas.label}
          </option>
        ))}
      </select>
    </label>
  );

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

  if (view === "species") {
    return (
      <div className="app">
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
          {viewToggle}
          {synthesisImportBanner}
        </header>
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
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
          {viewToggle}
          {synthesisImportBanner}
        </header>
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
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
          {viewToggle}
          {synthesisImportBanner}
        </header>
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
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
          {viewToggle}
          {synthesisImportBanner}
        </header>
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
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
          {viewToggle}
          {synthesisImportBanner}
          {atlasSelector}
          <p className="demo-badge">Cargando…</p>
        </header>
      </div>
    );
  }

  const badge =
    source.kind === "real"
      ? `DATOS REALES · ${selectedAtlas.label} · ${source.nodes.length} regiones, ${source.connections.length} conexiones`
      : "DATOS SINTÉTICOS · SOLO ILUSTRATIVOS (la API no respondió, o este atlas aún no tiene datos — revisa docker compose up -d)";

  return (
    <div className="app">
      <header>
        <h1>NeuroGraph — vista de desarrollo</h1>
        {viewToggle}
        {synthesisImportBanner}
        {atlasSelector}
        <p className={source.kind === "real" ? "real-badge" : "demo-badge"}>{badge}</p>
      </header>
      <div className="layout">
        <FilterPanel nodes={source.nodes} />
        <main>
          {/* Diseño de tres paneles (decisión de la usuaria, 30/08/2026):
              connectograma y hemisferios apilados en una misma columna,
              junto a un cerebro 3D del doble de tamaño que muestra SOLO
              la red de foco actual (Brain3D.tsx), nunca el grafo
              completo -- eso ya lo hacen los otros dos. */}
          <div className="panel-column">
            <section className="panel">
              <h2>Connectograma</h2>
              <Connectogram nodes={source.nodes} connections={source.connections} />
            </section>
            <section className="panel">
              <h2>Hemisferios</h2>
              <Hemisferios nodes={source.nodes} connections={source.connections} />
            </section>
          </div>
          <section className="panel panel--focus">
            <h2>Cerebro 3D — foco de la selección</h2>
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
                />
              </ErrorBoundary>
            </div>
          </section>
        </main>
        <DetailPanel
          nodes={source.nodes}
          connections={source.connections}
          canFetchTracts={source.kind === "real"}
        />
      </div>
    </div>
  );
}
