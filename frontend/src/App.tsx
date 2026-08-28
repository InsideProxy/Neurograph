import { useEffect, useState } from "react";
import { Connectogram } from "./components/Connectogram";
import { Brain3D } from "./components/Brain3D";
import { FilterPanel } from "./components/FilterPanel";
import { DetailPanel } from "./components/DetailPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DEMO_CONNECTIONS, DEMO_NODES } from "./data/demo";
import { fetchRealNodes } from "./data/api";
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

const HCP_MMP1_ATLAS_ID = "atlas.human.hcp.mmp1_0";

export default function App() {
  const [source, setSource] = useState<DataSource>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchRealNodes(HCP_MMP1_ATLAS_ID)
      .then((nodes) => {
        if (cancelled) return;
        if (nodes.length === 0) {
          // La API respondió pero la base de datos aún no tiene regiones
          // dadas de alta: no es un error, solo no hay nada real que
          // mostrar todavía.
          setSource({ kind: "demo", nodes: DEMO_NODES, connections: DEMO_CONNECTIONS });
          return;
        }
        // Fase 4 (conectividad) todavía no está hecha: hay regiones
        // reales pero ninguna conexión real todavía.
        setSource({ kind: "real", nodes, connections: [] });
      })
      .catch(() => {
        if (cancelled) return;
        setSource({ kind: "demo", nodes: DEMO_NODES, connections: DEMO_CONNECTIONS });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (source.kind === "loading") {
    return (
      <div className="app">
        <header>
          <h1>NeuroGraph — vista de desarrollo</h1>
          <p className="demo-badge">Cargando…</p>
        </header>
      </div>
    );
  }

  const badge =
    source.kind === "real"
      ? "DATOS REALES · HCP-MMP1.0 (360 regiones) · sin conexiones todavía (Fase 4)"
      : "DATOS SINTÉTICOS · SOLO ILUSTRATIVOS (la API no respondió — revisa docker compose up -d)";

  return (
    <div className="app">
      <header>
        <h1>NeuroGraph — vista de desarrollo</h1>
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
