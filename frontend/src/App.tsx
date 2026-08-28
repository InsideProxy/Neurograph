import { Connectogram } from "./components/Connectogram";
import { Brain3D } from "./components/Brain3D";
import { FilterPanel } from "./components/FilterPanel";
import { DetailPanel } from "./components/DetailPanel";
import { DEMO_CONNECTIONS, DEMO_NODES } from "./data/demo";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>NeuroGraph — vista de desarrollo</h1>
        <p className="demo-badge">DATOS SINTÉTICOS · SOLO ILUSTRATIVOS</p>
      </header>
      <div className="layout">
        <FilterPanel />
        <main>
          <section className="panel">
            <h2>Connectograma</h2>
            <Connectogram nodes={DEMO_NODES} connections={DEMO_CONNECTIONS} />
          </section>
          <section className="panel">
            <h2>Cerebro 3D</h2>
            <div className="canvas-wrap">
              <Brain3D nodes={DEMO_NODES} connections={DEMO_CONNECTIONS} />
            </div>
          </section>
        </main>
        <DetailPanel nodes={DEMO_NODES} connections={DEMO_CONNECTIONS} />
      </div>
    </div>
  );
}
