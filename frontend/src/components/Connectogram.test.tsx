import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Connectogram } from "./Connectogram";

describe("Connectogram", () => {
  it("la lupa es un botón de alternar con aria-pressed, no una casilla (spec 5.4)", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={[]} connections={[]} />);
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>(?:(?!<\/button>).)*Lupa<\/button>/s);
    expect(html).not.toContain('type="checkbox"');
  });
});
