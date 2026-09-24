// Cola de avisos flotantes (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.6). Cada aviso tiene la clave de su
// origen ("importar", "redes"): uno nuevo sustituye al anterior del mismo
// origen, como pasaba con las franjas de error. Se quedan hasta que se
// cierran. Funciones puras: se prueban sin DOM.

export type ToastTone = "error" | "info";

export interface ToastContent {
  tone: ToastTone;
  // Mensaje comprensible, a la vista.
  message: string;
  // Texto técnico completo, en «Detalles».
  details?: string;
}

export interface ToastEntry extends ToastContent {
  key: string;
}

export function showToast(queue: readonly ToastEntry[], key: string, content: ToastContent): ToastEntry[] {
  return [...queue.filter((toast) => toast.key !== key), { key, ...content }];
}

// Si no hay aviso de esa clave devuelve la misma cola: setState no vuelve a
// pintar.
export function dismissToast(queue: ToastEntry[], key: string): ToastEntry[] {
  return queue.some((toast) => toast.key === key) ? queue.filter((toast) => toast.key !== key) : queue;
}
