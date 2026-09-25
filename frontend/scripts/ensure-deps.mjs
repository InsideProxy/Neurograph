// Dependencias de npm al día antes de `npm run dev` y `npm run build`
// (H5 de docs/decisiones-herramientas.md): tras un pull, instala lo que
// falte sin tener que acordarse de `npm install`.
//
// Compara package-lock.json con el lockfile oculto que npm escribe en cada
// instalación, node_modules/.package-lock.json, que dice lo que de verdad
// dejó instalado. Si coinciden, sale enseguida y sin decir nada; si no,
// ejecuta `npm install`. Solo usa Node, sin dependencias, porque tiene que
// funcionar también cuando faltan todas, en Linux y en Windows.
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

// Las rutas de package-lock.json («node_modules/vite»…) que no están
// instaladas tal cual: vacío si node_modules está al día. `installed` es el
// lockfile oculto, o null si no existe. La raíz («») es el propio frontend.
//
// Un paquete opcional que falte no cuenta. npm deja fuera los que no son
// para este sistema (os, cpu, libc) o no cumplen `engines`, lo que solo
// ellos necesitan y los que fallan al instalarse, y package-lock.json no
// guarda todo lo que usa para decidirlo: no guarda libc, y con el mismo
// lockfile npm instaló en Linux unas variantes musl y otras no (H5). Si
// están instalados, sí tienen que coincidir, como los demás.
export function pendingPackages(lock, installed) {
  const entries = Object.entries(lock?.packages ?? {}).filter(([path]) => path !== "");
  if (!installed?.packages) return entries.map(([path]) => path);
  return entries
    .filter(([path, locked]) => {
      const current = installed.packages[path];
      if (!current) return !locked.optional;
      return (
        current.version !== locked.version ||
        (locked.resolved !== undefined && current.resolved !== locked.resolved) ||
        (locked.integrity !== undefined && current.integrity !== locked.integrity)
      );
    })
    .map(([path]) => path);
}

// Sin el BOM que deja algún editor de Windows, que npm también tolera.
function readJson(url) {
  return JSON.parse(readFileSync(url, "utf8").replace(/^﻿/, ""));
}

function main() {
  const frontend = new URL("..", import.meta.url);
  let lock;
  try {
    lock = readJson(new URL("package-lock.json", frontend));
  } catch (error) {
    if (error.code === "ENOENT") return 0; // sin lockfile no hay con qué comparar
    console.error(`No se puede leer package-lock.json: ${error.message}`);
    return 1;
  }
  let installed = null;
  try {
    installed = readJson(new URL("node_modules/.package-lock.json", frontend));
  } catch {
    // Sin lockfile oculto, o a medio escribir: se instala.
  }
  if (pendingPackages(lock, installed).length === 0) return 0;

  console.log("Instalando las dependencias de npm que faltan…");
  // Con shell, porque en Windows npm es npm.cmd y Node no lanza un .cmd sin
  // ella. La orden es fija, sin nada que venga de fuera.
  const npm = spawnSync("npm install --no-audit --no-fund", {
    cwd: fileURLToPath(frontend),
    stdio: "inherit",
    shell: true,
  });
  if (npm.error) {
    console.error(`No se pudo ejecutar npm: ${npm.error.message}`);
    return 1;
  }
  return npm.status ?? 1;
}

// Solo al ejecutarlo con `node scripts/ensure-deps.mjs`, no al importarlo
// desde las pruebas. Node resuelve los enlaces del script principal, así
// que se comparan las rutas reales.
function isMain() {
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMain()) process.exitCode = main();
