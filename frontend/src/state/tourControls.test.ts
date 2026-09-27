import { describe, expect, it } from "vitest";
import { registerTourControl, tourControl } from "./tourControls";

describe("controles del tour (lo que vive dentro de un componente)", () => {
  it("un componente montado los ofrece, y el tour los lee y los cambia", () => {
    let lens = false;
    const unregister = registerTourControl("lupa", { get: () => lens, set: (value) => (lens = value) });
    expect(tourControl("lupa")?.get()).toBe(false);
    tourControl("lupa")?.set(true);
    expect(lens).toBe(true);
    unregister();
    expect(tourControl("lupa")).toBeUndefined();
  });

  it("al desmontarse, uno viejo no se lleva el que ha puesto otro después (StrictMode monta dos veces)", () => {
    const first = registerTourControl("buscador", { get: () => "uno", set: () => {} });
    const second = registerTourControl("buscador", { get: () => "dos", set: () => {} });
    first();
    expect(tourControl("buscador")?.get()).toBe("dos");
    second();
    expect(tourControl("buscador")).toBeUndefined();
  });
});
