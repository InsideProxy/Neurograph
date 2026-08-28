import { Connectogram } from "./components/Connectogram";
import { Brain3D } from "./components/Brain3D";
import { DEMO_CONNECTIONS, DEMO_NODES } from "./data/demo";
import { useSelectionStore } from "./state/selection";
import "./App.css";

export default function App() {
  const { selectedNodeId, selectedConnectionId } = useSelectionStore();
  const selectedNode = DEMO_NODES.find((n) => n.id === selectedNodeId);
  const selectedConnection = DEMO_CONNECTIONS.find((c) => c.id === selectedConnectionId);

  return (
    <div className="app">
      <header>
        <h1>NeuroGraph — vista de desarrollo</h1>
        <p className="demo-badge">DATOS SINTÉTICOS · SOLO ILUSTRATIVOS</p>
      </header>
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
      <footer>
        {selectedNode && <p>Región seleccionada: <strong>{selectedNode.label}</strong> ({selectedNode.id})</p>}
        {selectedConnection && (
          <p>
            Conexión seleccionada: <strong>{selectedConnection.id}</strong> ({selectedConnection.type},
            peso {selectedConnection.weight})
          </p>
        )}
        {!selectedNode && !selectedConnection && <p>Selecciona un nodo o una conexión en cualquiera de las dos vistas.</p>}
      </footer>
    </div>
  );
}
