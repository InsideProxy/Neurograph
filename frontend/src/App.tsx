import { useEffect, useState } from "react";
import { Connectogram } from "./components/Connectogram";
import { Brain3D } from "./components/Brain3D";
import { FilterPanel } from "./components/FilterPanel";
import { DetailPanel } from "./components/DetailPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DEMO_CONNECTIONS, DEMO_NODES } from "./data/demo";
import { fetchRealConnections, fetchRealNodes } from "./data/api";
import type { GraphConnection, GraphNode } from "./types/domain";
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
// ninguna red funcional calculada todavía. Mostrar los dos a la vez sería
// mezclar sus nodos (que ocupan el mismo espacio físico del cerebro dos
// veces, una por cada parcelación) — así que se elige uno u otro, nunca
// los dos superpuestos.
interface AtlasOption {
  id: string;
  label: string;
}

const ATLASES: AtlasOption[] = [
  { id: "atlas.human.hcp.mmp1_0", label: "HCP-MMP1.0 — 360 regiones, redes funcionales" },
  { id: "atlas.human.brainnetome.bna_246", label: "Brainnetome — 246 regiones, conectividad estructural" },
];

export default function App() {
  const [selectedAtlasId, setSelectedAtlasId] = useState(ATLASES[0].id);
  const [source, setSource] = useState<DataSource>({ kind: "loading" });

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

  if (source.kind === "loading") {
    return (
      <div className="app">
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
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
        {atlasSelector}
        <p className={source.kind === "real" ? "real-badge" : "demo-badge"}>{badge}</p>
      </header>
      <div className="layout">
        <FilterPanel />
        <main>
          <section className="panel">
            <h2>Connectograma</h2>
            <Connectogram nodes={source.nodes} connections={source.connections} />
          </section>
          <section className="panel">
            <h2>Cerebro 3D</h2>
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
                <Brain3D nodes={source.nodes} connections={source.connections} />
              </ErrorBoundary>
            </div>
          </section>
        </main>
        <DetailPanel nodes={source.nodes} connections={source.connections} />
      </div>
    </div>
  );
}
