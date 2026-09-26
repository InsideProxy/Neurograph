// Paso de preparación: las dependencias de npm que falten (H5). Lo ejecuta
// scripts/prepare.mjs antes de `npm run dev`, `npm run build` y
// `npm run tauri`, así que tras un pull se instala lo nuevo sin tener que
// acordarse de `npm install`.
//
// Compara package-lock.json con el lockfile oculto que npm escribe en cada
// instalación, node_modules/.package-lock.json, que dice lo que de verdad
// dejó instalado. Si falta algo, ejecuta `npm install` con la
// configuración de npm del usuario: con `ignore-scripts=true`, los paquetes
// siguen sin ejecutar sus scripts de instalación. Solo usa Node, sin
// dependencias, porque tiene que funcionar también cuando faltan todas, en
// Linux y en Windows.
//
// Si instala algo y el npm que lo ejecuta es anterior a 11.10.0, añade un
// aviso de que ese npm ignora en silencio `min-release-age` del `.npmrc`
// del proyecto (H6, ver scripts/npm-version.mjs).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { npmMinReleaseAgeNotice } from "./npm-version.mjs";

const FRONTEND = new URL("..", import.meta.url);

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

// La línea del paso al instalar: la de instalación y, si el npm que la
// ejecuta ignora min-release-age, el aviso de H6 después. Pura: compone,
// no lee el entorno.
export function installLine(userAgent) {
  const line = "Instalando las dependencias de npm que faltan…";
  const notice = npmMinReleaseAgeNotice(userAgent);
  return notice ? `${line}\n${notice}` : line;
}

// Un JSON del frontend, o null si no existe. Sin el BOM que deja algún
// editor de Windows, que npm también tolera.
function readJson(name) {
  try {
    return JSON.parse(readFileSync(new URL(name, FRONTEND), "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export const npmDependencies = {
  pending() {
    let lock;
    try {
      lock = readJson("package-lock.json");
    } catch (error) {
      throw new Error(`No se puede leer package-lock.json: ${error.message}`);
    }
    if (!lock) return null; // sin lockfile no hay con qué comparar
    let installed = null;
    try {
      installed = readJson("node_modules/.package-lock.json");
    } catch {
      // A medio escribir: se instala.
    }
    return pendingPackages(lock, installed).length > 0 ? installLine(process.env.npm_config_user_agent) : null;
  },

  run() {
    // Con shell, porque en Windows npm es npm.cmd y Node no lanza un .cmd
    // sin ella. La orden es fija, sin nada que venga de fuera.
    const npm = spawnSync("npm install --no-audit --no-fund", {
      cwd: fileURLToPath(FRONTEND),
      stdio: "inherit",
      shell: true,
    });
    if (npm.error) throw new Error(`No se pudo ejecutar npm: ${npm.error.message}`);
    return npm.status ?? 1;
  },
};
