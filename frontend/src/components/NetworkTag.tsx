// Etiqueta de red con su color y resumen de una región (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.4 y 5.5).
// Los usan los recuadros de lectura del connectograma y de los hemisferios
// y el panel de detalle.
import { hemisphereLabel, networkShortLabel, regionTitleParts } from "../logic/displayText";
import { NETWORK_LABELS } from "../theme/networks";
import { useDrawColors } from "../theme/useDrawColors";
import type { GraphNode } from "../types/domain";

// A la vista, el nombre corto de la red, porque la clasificación ya está en
// el botón «Redes» de la barra; para los lectores de pantalla y en la
// etiqueta emergente, el completo. El color sale de useDrawColors, como en
// las vistas: cuando llegue la paleta suave (fase 2), la seguirá. El punto
// lleva un anillo neutro (principio 6 del spec) en App.css. Si el nombre
// corto no cabe (los de Yeo y Power llegan a 600 px), se corta con «…»: el
// completo sigue en el title y en el texto oculto.
export function NetworkTag({ network }: { network: string }) {
  const colors = useDrawColors();
  const label = Object.hasOwn(NETWORK_LABELS, network) ? NETWORK_LABELS[network] : network;
  return (
    <span className="network-tag" title={label}>
      <span className="network-tag__dot" style={{ backgroundColor: colors.networkColor(network) }} aria-hidden="true" />
      <span className="network-tag__name" aria-hidden="true">
        {networkShortLabel(network)}
      </span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

// Región, hemisferio y red: «IFJa — Area IFJa · hemisferio derecho» y la
// etiqueta de su red.
export function RegionSummary({ node }: { node: GraphNode }) {
  const { main, secondary } = regionTitleParts(node);
  return (
    <span className="region-summary">
      <strong>{main}</strong>
      {secondary && ` — ${secondary}`}
      {` · ${hemisphereLabel(node.hemisphere).toLowerCase()}`}
      <NetworkTag network={node.network} />
    </span>
  );
}
