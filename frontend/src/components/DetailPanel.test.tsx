import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphConnection, GraphNode } from "../types/domain";
import { RegionDetail } from "./DetailPanel";

function node(id: string, abbreviation: string): GraphNode {
  return {
    id,
    label: `Area ${abbreviation} (hemisferio derecho)`,
    abbreviation,
    hemisphere: "R",
    network: "cole-anticevic.visual",
    position3d: [0, 0, 0],
    referenceSpace: null,
  };
}

const REGION = node("r_ifja", "IFJa");
const OTHERS = ["a", "b", "c", "d", "e", "f"].map((id) => node(`r_${id}`, id.toUpperCase()));
// Seis conexiones; la más fuerte, efectiva y con la región como origen.
const CONNECTIONS: GraphConnection[] = OTHERS.map((other, i) => ({
  id: `c${i}`,
  source: REGION.id,
  target: other.id,
  type: i === 5 ? "effective" : "structural",
  weight: (i + 1) / 10,
  evidenceLevel: "direct",
}));

describe("RegionDetail", () => {
  const html = renderToStaticMarkup(
    <RegionDetail node={REGION} connections={CONNECTIONS} nodeById={new Map([REGION, ...OTHERS].map((n) => [n.id, n]))} />,
  );

  it("se ven las cinco primeras, y «Ver las N» dice si la lista está desplegada y cuál controla", () => {
    expect(html.match(/<li class="detail__connection">/g)).toHaveLength(5);
    const listId = /<ul class="detail__connections" id="([^"]+)"/.exec(html)?.[1];
    expect(listId).toBeDefined();
    expect(html).toContain(`aria-expanded="false" aria-controls="${listId}"`);
    expect(html).toContain("Ver las 6");
  });

  it("el botón de copiar tiene nombre, y lo que pasa al copiar se anuncia en una región role=status", () => {
    expect(html).toContain('aria-label="Copiar el identificador"');
    expect(html).toContain('<span class="visually-hidden" role="status"></span>');
  });

  it("una conexión efectiva dice su sentido", () => {
    expect(html).toContain('<span class="detail__connection-direction">hacia </span>');
  });
});
