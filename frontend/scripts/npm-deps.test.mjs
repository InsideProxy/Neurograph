// Cuándo hay que instalar las dependencias de npm (H5): la comparación
// pura de scripts/npm-deps.mjs, sin tocar node_modules ni ejecutar npm.
import { describe, expect, it } from "vitest";
import { installLine, pendingPackages } from "./npm-deps.mjs";

const DRIVER = "node_modules/driver.js";
const VITE = "node_modules/vite";
const GNU = "node_modules/@rolldown/binding-linux-x64-gnu";
const WIN = "node_modules/@rolldown/binding-win32-x64-msvc";
const MUSL = "node_modules/@tauri-apps/cli-linux-x64-musl";

// Un package-lock.json con la forma del real: la raíz, un paquete de
// producción, uno de desarrollo y binarios opcionales por plataforma.
function lockfile() {
  const registry = "https://registry.npmjs.org";
  return {
    name: "neurograph-frontend",
    version: "0.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": { name: "neurograph-frontend", version: "0.0.0", dependencies: { "driver.js": "1.8.0" } },
      [DRIVER]: { version: "1.8.0", resolved: `${registry}/driver.js/-/driver.js-1.8.0.tgz`, integrity: "sha512-driver" },
      [VITE]: { version: "8.2.2", resolved: `${registry}/vite/-/vite-8.2.2.tgz`, integrity: "sha512-vite", dev: true },
      [GNU]: {
        version: "1.2.6",
        resolved: `${registry}/@rolldown/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.2.6.tgz`,
        integrity: "sha512-gnu",
        dev: true,
        optional: true,
        os: ["linux"],
        cpu: ["x64"],
      },
      [WIN]: {
        version: "1.2.6",
        resolved: `${registry}/@rolldown/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.2.6.tgz`,
        integrity: "sha512-win",
        dev: true,
        optional: true,
        os: ["win32"],
        cpu: ["x64"],
      },
      // Como en el lockfile real: dice linux y x64, pero no libc, y npm no
      // lo instala en un Linux con glibc.
      [MUSL]: {
        version: "2.11.4",
        resolved: `${registry}/@tauri-apps/cli-linux-x64-musl/-/cli-linux-x64-musl-2.11.4.tgz`,
        integrity: "sha512-musl",
        dev: true,
        optional: true,
        os: ["linux"],
        cpu: ["x64"],
      },
    },
  };
}

// El lockfile oculto que npm deja al instalar `lock`: copia sus entradas,
// sin la raíz ni las de `skipped`.
function installedFrom(lock, skipped = []) {
  const packages = Object.fromEntries(
    Object.entries(structuredClone(lock.packages)).filter(([path]) => path !== "" && !skipped.includes(path)),
  );
  return { name: lock.name, version: lock.version, lockfileVersion: 3, requires: true, packages };
}

describe("pendingPackages: qué falta por instalar", () => {
  it("al día: todo lo del lockfile está instalado con su versión, su resolved y su integrity; la raíz no cuenta", () => {
    const lock = lockfile();
    expect(pendingPackages(lock, installedFrom(lock, [WIN, MUSL]))).toEqual([]);
  });

  it("si falta un paquete, de producción o de desarrollo, hay que instalarlo", () => {
    const lock = lockfile();
    expect(pendingPackages(lock, installedFrom(lock, [WIN, MUSL, DRIVER]))).toEqual([DRIVER]);
    expect(pendingPackages(lock, installedFrom(lock, [WIN, MUSL, VITE]))).toEqual([VITE]);
  });

  it("tras un pull que cambia una versión, hay que instalarla", () => {
    const lock = lockfile();
    const installed = installedFrom(lock, [WIN, MUSL]);
    lock.packages[DRIVER] = {
      version: "1.8.1",
      resolved: "https://registry.npmjs.org/driver.js/-/driver.js-1.8.1.tgz",
      integrity: "sha512-driver181",
    };
    expect(pendingPackages(lock, installed)).toEqual([DRIVER]);
  });

  it("con la misma versión, otro resolved u otro integrity también cuentan", () => {
    const lock = lockfile();
    const otherIntegrity = installedFrom(lock, [WIN, MUSL]);
    otherIntegrity.packages[VITE].integrity = "sha512-otra";
    expect(pendingPackages(lock, otherIntegrity)).toEqual([VITE]);
    const otherResolved = installedFrom(lock, [WIN, MUSL]);
    otherResolved.packages[VITE].resolved = "https://example.org/vite-8.2.2.tgz";
    expect(pendingPackages(lock, otherResolved)).toEqual([VITE]);
  });

  it("sin lockfile oculto, todo está por instalar; sin dependencias, nada", () => {
    const lock = lockfile();
    expect(pendingPackages(lock, null)).toEqual([DRIVER, VITE, GNU, WIN, MUSL]);
    expect(pendingPackages({ lockfileVersion: 3, packages: { "": { name: "vacio" } } }, null)).toEqual([]);
  });

  it("un opcional que npm deja fuera no cuenta, aunque sea de esta plataforma: el lockfile no dice cuáles instala", () => {
    const lock = lockfile();
    // Los de otra plataforma y el musl que npm no instaló en glibc...
    expect(pendingPackages(lock, installedFrom(lock, [WIN, MUSL]))).toEqual([]);
    // ...y también el de Linux x64, que npm salta si falla al instalarse.
    // Si no, un opcional que npm nunca instala haría reinstalar siempre.
    expect(pendingPackages(lock, installedFrom(lock, [GNU, WIN, MUSL]))).toEqual([]);
  });

  it("un opcional instalado con otra versión sí cuenta: un pull que lo cambia se instala", () => {
    const lock = lockfile();
    const installed = installedFrom(lock, [WIN, MUSL]);
    installed.packages[GNU].version = "1.2.5";
    expect(pendingPackages(lock, installed)).toEqual([GNU]);
  });

  it("lo que sobra en node_modules no cuenta", () => {
    const lock = lockfile();
    const installed = installedFrom(lock, [WIN, MUSL]);
    installed.packages["node_modules/left-pad"] = { version: "1.3.0" };
    expect(pendingPackages(lock, installed)).toEqual([]);
  });
});

describe("installLine: la línea del paso al instalar, con el aviso de H6 si hace falta", () => {
  it("con un npm que ya aplica min-release-age, o sin user-agent, solo la línea de instalación", () => {
    expect(installLine("npm/11.10.0 node/v22.12.0 linux x64 workspaces/false")).toBe(
      "Instalando las dependencias de npm que faltan…",
    );
    expect(installLine(undefined)).toBe("Instalando las dependencias de npm que faltan…");
  });

  it("con un npm anterior a 11.10.0, el aviso va después, en su propia línea", () => {
    expect(installLine("npm/10.9.0 node/v22.12.0 linux x64 workspaces/false")).toBe(
      "Instalando las dependencias de npm que faltan…\n" +
        "Tu npm (10.9.0) no aplica el retardo de seguridad (min-release-age): actualízalo con `npm install -g npm@11`.",
    );
  });
});
