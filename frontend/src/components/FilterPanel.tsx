// Panel de filtros (secciones 5.1 y 20): permite ocultar redes, ocultar
// tipos de conectividad y aplicar un umbral mínimo de peso. Sirve también
// de leyenda: el color de cada casilla es el mismo que usan las dos
// visualizaciones (src/theme/networks.ts).
import { CONNECTION_TYPE_LABELS, NETWORK_COLORS, NETWORK_LABELS } from "../theme/networks";
import { useFiltersStore, type ConnectionType } from "../state/filters";

const CONNECTION_TYPES: ConnectionType[] = ["structural", "functional", "effective"];

export function FilterPanel() {
  const {
    hiddenNetworks,
    hiddenConnectionTypes,
    minWeight,
    toggleNetwork,
    toggleConnectionType,
    setMinWeight,
  } = useFiltersStore();

  return (
    <aside className="filter-panel">
      <h2>Filtros</h2>

      <fieldset>
        <legend>Redes</legend>
        {Object.keys(NETWORK_LABELS).map((network) => (
          <label key={network} className="filter-row">
            <input
              type="checkbox"
              checked={!hiddenNetworks.has(network)}
              onChange={() => toggleNetwork(network)}
            />
            <span
              className="legend-swatch"
              style={{ backgroundColor: NETWORK_COLORS[network] }}
            />
            {NETWORK_LABELS[network]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Tipo de conectividad</legend>
        {CONNECTION_TYPES.map((type) => (
          <label key={type} className="filter-row">
            <input
              type="checkbox"
              checked={!hiddenConnectionTypes.has(type)}
              onChange={() => toggleConnectionType(type)}
            />
            {CONNECTION_TYPE_LABELS[type]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Peso mínimo: {minWeight.toFixed(2)}</legend>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={minWeight}
          onChange={(event) => setMinWeight(Number(event.target.value))}
        />
      </fieldset>
    </aside>
  );
}
