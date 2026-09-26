import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkedLabel } from "./MarkedLabel";

const COLORS = { mark: "#2563eb", markText: "#ffffff" };

describe("MarkedLabel", () => {
  it("es la abreviatura con el texto de marca sobre una pastilla del color de marca, sin eventos y marcada para no exportarse", () => {
    const html = renderToStaticMarkup(
      <svg>
        <MarkedLabel text="IFJa" x={100} y={50} anchor="start" fontSize={6} fontWeight={600} colors={COLORS} />
      </svg>,
    );
    expect(html).toMatch(/^<svg><g data-ng-mark="" style="pointer-events:none"><rect [^>]*rx="[\d.]+"[^>]*fill="#2563eb"><\/rect><text /);
    expect(html).toContain(
      '<text x="100" y="50" text-anchor="start" dominant-baseline="central" font-size="6" font-weight="600" fill="#ffffff">IFJa</text>',
    );
  });

  it("girada, la pastilla gira con el texto", () => {
    const html = renderToStaticMarkup(
      <svg>
        <MarkedLabel
          text="V1"
          x={10}
          y={20}
          anchor="end"
          fontSize={15}
          fontWeight={700}
          transform="rotate(30 10 20)"
          colors={COLORS}
        />
      </svg>,
    );
    expect(html.match(/transform="rotate\(30 10 20\)"/g)).toHaveLength(2);
  });
});
