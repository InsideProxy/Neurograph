// Acciones que solo existen en la aplicación de escritorio (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.6).
// "Importar síntesis" abre el diálogo nativo de Tauri, que en el navegador
// (npm run dev) no existe. Se pregunta a isTauri() antes de intentarlo;
// nunca se compara el texto del error, que cambia según el navegador.
import { isTauri } from "@tauri-apps/api/core";

export const IMPORT_DESKTOP_ONLY_MESSAGE = "“Importar síntesis” solo funciona en la aplicación de escritorio.";

export type DesktopOnlyResult<T> = { kind: "browser" } | { kind: "done"; value: T };

export async function runInDesktop<T>(
  action: () => Promise<T>,
  inDesktop: () => boolean = isTauri,
): Promise<DesktopOnlyResult<T>> {
  if (!inDesktop()) return { kind: "browser" };
  return { kind: "done", value: await action() };
}
