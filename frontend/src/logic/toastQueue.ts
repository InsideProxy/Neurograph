// Cola de avisos flotantes (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.6). Cada aviso tiene la clave de su
// origen ("importar", "redes"): uno nuevo sustituye al anterior del mismo
// origen, como pasaba con las franjas de error. Se quedan hasta que se
// cierran. Funciones puras: se prueban sin DOM.

export type ToastTone = "error" | "info";

// Un botón con una acción, además de «Entendido»: el «Deshacer» del aviso
// de deshacer (spec 5.7).
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastContent {
  tone: ToastTone;
  // Mensaje comprensible, a la vista.
  message: string;
  // Texto técnico completo, en «Detalles».
  details?: string;
  // Un aviso discreto, como el de deshacer, no interrumpe: no lleva
  // role="alert", y su texto lo anuncia la región viva de ToastRegion
  // (aria-live="polite").
  polite?: boolean;
  action?: ToastAction;
  // Se va solo pasado este tiempo, salvo mientras tiene el ratón encima o
  // el foco. stamp distingue un aviso nuevo del anterior del mismo origen:
  // con él, el tiempo vuelve a empezar y el texto se vuelve a anunciar.
  autoDismissMs?: number;
  stamp?: number;
  // Adónde va el foco tras usar su acción, o al cerrarlo si es el último
  // aviso, en lugar de volver a «Importar».
  returnFocus?: () => void;
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
