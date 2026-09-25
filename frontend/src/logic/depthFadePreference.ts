// Preferencia «Atenuar lo que queda detrás» del cerebro 3D (Legibilidad del
// 3D; docs/rediseno-interfaz-diseno.md, 6.3): activada por defecto y guardada
// en este navegador, para quien lo use. Cada lectura y escritura va en
// try/catch, como la apariencia (state/appearance.ts): si el almacenamiento
// falla o no existe, vale el valor por defecto y el interruptor sigue
// funcionando durante la sesión.
import type { StorageLike } from "../state/appearance";

export const DEPTH_FADE_STORAGE_KEY = "neurograph.cerebro3d.atenuar";

export function readDepthFadePreference(storage: StorageLike | null): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(DEPTH_FADE_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writeDepthFadePreference(storage: StorageLike | null, enabled: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(DEPTH_FADE_STORAGE_KEY, String(enabled));
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): la elección dura solo
    // esta sesión.
  }
}
