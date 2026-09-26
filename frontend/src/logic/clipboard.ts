// Copiar al portapapeles (D4 de docs/decisiones-diseno.md; spec 5.5). Nunca
// lanza: sin portapapeles (contexto no seguro, permiso denegado) devuelve
// false, y quien llama selecciona el texto para copiarlo a mano.
export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

export async function copyText(text: string, clipboard: ClipboardLike | undefined): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Cómo se escribe un atajo de teclado en cada sistema: «⌘C» en macOS y
// «Ctrl+C» en los demás. Lo usan el ID científico y el buscador de
// regiones (Ctrl+K, logic/regionSearch.ts).
export function shortcutLabel(key: string, userAgent: string): string {
  return /Mac/i.test(userAgent) ? `⌘${key}` : `Ctrl+${key}`;
}

// Atajo para copiar a mano lo seleccionado: ⌘C en macOS y Ctrl+C en los
// demás sistemas.
export function copyShortcutLabel(userAgent: string): string {
  return shortcutLabel("C", userAgent);
}
