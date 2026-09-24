import { describe, expect, it } from "vitest";
import { formatCount } from "./displayText";

describe("formatCount", () => {
  it("separa los miles con un espacio duro a partir de cinco cifras", () => {
    expect(formatCount(64620)).toBe("64 620");
    expect(formatCount(1234567)).toBe("1 234 567");
  });

  it("deja sin separar los números de hasta cuatro cifras", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(360)).toBe("360");
    expect(formatCount(1047)).toBe("1047");
  });
});
