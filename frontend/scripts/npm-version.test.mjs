// El aviso de min-release-age (H9): si el npm que instala es anterior a
// 11.10.0, no aplica esa protección del .npmrc y la ignora en silencio.
// Solo la lógica pura: parsear `npm_config_user_agent` y comparar
// versiones, sin tocar el entorno ni ejecutar npm.
import { describe, expect, it } from "vitest";
import { npmMinReleaseAgeNotice, npmVersionFromUserAgent, supportsMinReleaseAge } from "./npm-version.mjs";

const NPM_10_9 = "npm/10.9.0 node/v22.12.0 linux x64 workspaces/false";
const NPM_11_10 = "npm/11.10.0 node/v22.12.0 linux x64 workspaces/false";
const NPM_11_20 = "npm/11.20.0 node/v22.12.0 linux x64 workspaces/false";
const NPM_12 = "npm/12.0.0 node/v22.14.0 linux x64 workspaces/false";
const PNPM = "pnpm/9.1.0 npm/? node/v20.11.0 linux x64";
const YARN = "yarn/1.22.19 npm/? node/v20.11.0 linux x64";

describe("npmVersionFromUserAgent: qué gestor y qué versión hay detrás del user-agent", () => {
  it("con npm, su versión", () => {
    expect(npmVersionFromUserAgent(NPM_10_9)).toBe("10.9.0");
    expect(npmVersionFromUserAgent(NPM_11_10)).toBe("11.10.0");
    expect(npmVersionFromUserAgent(NPM_11_20)).toBe("11.20.0");
    expect(npmVersionFromUserAgent(NPM_12)).toBe("12.0.0");
  });

  it("con pnpm o yarn, null: no es npm aunque el user-agent lleve «npm/?»", () => {
    expect(npmVersionFromUserAgent(PNPM)).toBeNull();
    expect(npmVersionFromUserAgent(YARN)).toBeNull();
  });

  it("sin la variable (el script se ejecutó con node, no con un script de npm), null", () => {
    expect(npmVersionFromUserAgent(undefined)).toBeNull();
    expect(npmVersionFromUserAgent("")).toBeNull();
  });
});

describe("supportsMinReleaseAge: si esa versión de npm ya aplica el retardo", () => {
  it("anterior a 11.10.0, no la aplica", () => {
    expect(supportsMinReleaseAge("10.9.0")).toBe(false);
    expect(supportsMinReleaseAge("11.9.9")).toBe(false);
  });

  it("numérico, no como texto: 11.9.0 es anterior a 11.10.0 aunque «9» > «1» como carácter", () => {
    expect(supportsMinReleaseAge("11.9.0")).toBe(false);
  });

  it("desde 11.10.0 (incluida) en adelante, la aplica", () => {
    expect(supportsMinReleaseAge("11.10.0")).toBe(true);
    expect(supportsMinReleaseAge("11.20.0")).toBe(true);
    expect(supportsMinReleaseAge("12.0.0")).toBe(true);
  });
});

describe("npmMinReleaseAgeNotice: la línea de aviso, o null si no hace falta", () => {
  it("con un npm viejo, avisa con su versión real", () => {
    expect(npmMinReleaseAgeNotice(NPM_10_9)).toBe(
      "Tu npm (10.9.0) no aplica el retardo de seguridad (min-release-age): actualízalo con `npm install -g npm@11`.",
    );
  });

  it("con 11.10.0 o más nuevo, no avisa", () => {
    expect(npmMinReleaseAgeNotice(NPM_11_10)).toBeNull();
    expect(npmMinReleaseAgeNotice(NPM_11_20)).toBeNull();
    expect(npmMinReleaseAgeNotice(NPM_12)).toBeNull();
  });

  it("con pnpm o yarn, no avisa: la opción es de npm", () => {
    expect(npmMinReleaseAgeNotice(PNPM)).toBeNull();
    expect(npmMinReleaseAgeNotice(YARN)).toBeNull();
  });

  it("sin la variable, no avisa", () => {
    expect(npmMinReleaseAgeNotice(undefined)).toBeNull();
  });
});
