// Preparación del frontend antes de arrancar (H5). `npm run dev`,
// `npm run build` y `npm run tauri` la ejecutan primero, dentro del propio
// script (`node scripts/prepare.mjs && vite`), y no como `predev` o
// `prebuild`, que npm se salta con `ignore-scripts=true`. En `tauri` va
// antes de lanzar la CLI de Tauri, porque en Windows npm no puede
// sustituirla mientras corre. Así, tras un pull, basta con arrancar: lo que
// falte se pone al día solo.
//
// Los pasos van en STEPS, en orden. Cada uno es un objeto con:
// - pending(): la línea corta, en castellano, que se imprime si hay algo
//   que hacer, o null si no lo hay. Sin nada que hacer, el paso no dice nada.
// - run(): lo hace y devuelve 0, o un código de error.
// Un código de error, o un error lanzado, del que se imprime el mensaje y se
// sale con 1, para la preparación: ni los pasos siguientes, ni Vite ni la
// compilación arrancan sobre algo roto.
//
// Para añadir un paso: su objeto en un módulo de scripts/, con sus pruebas
// al lado, y una línea más en STEPS, en el lugar que le toque.
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { npmDependencies } from "./npm-deps.mjs";

export const STEPS = [
  npmDependencies, // las dependencias de npm que falten
];

// Ejecuta los pasos en orden. Devuelve el código de salida: 0, o el del
// primero que falle.
export function prepare(steps) {
  for (const step of steps) {
    try {
      const line = step.pending();
      if (!line) continue;
      console.log(line);
      const status = step.run();
      // Un paso que no devuelve un número también para, con 1.
      if (status !== 0) return Number.isInteger(status) ? status : 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }
  return 0;
}

// Solo al ejecutarlo con `node scripts/prepare.mjs`, no al importarlo desde
// las pruebas. Node resuelve los enlaces del script principal, así que se
// comparan las rutas reales.
function isMain() {
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMain()) process.exitCode = prepare(STEPS);
