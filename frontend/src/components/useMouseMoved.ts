// Si un mousemove es un movimiento de verdad (D4 de docs/decisiones-diseno.md;
// revisión conjunta de la fase 3). WebKit envía mousemove sintéticos, con las
// mismas coordenadas, cuando el contenido se mueve bajo el ratón quieto: por
// ejemplo, al desplazarse con el teclado la lista de DataContextMenu o la del
// buscador de regiones. Tomados por buenos, la opción activa saltaría a la
// que ha quedado bajo el ratón.
//
// Se guarda dónde estaba el ratón en el último mousemove de toda la página,
// no solo de la lista: así tampoco cuenta como movimiento una lista que se
// abre bajo el ratón quieto. document lo apunta en la fase de burbuja,
// después de que el manejador de la opción (React escucha en la raíz, más
// abajo que document) lo haya comparado. Sin ninguno anterior (la lista
// se acaba de montar), no cuenta como movimiento (logic/listbox.ts,
// pointerMoved).
import { useEffect, useRef } from "react";
import { pointerMoved, type PointerPosition } from "../logic/listbox";

export function useMouseMoved(): (event: PointerPosition) => boolean {
  const last = useRef<PointerPosition | null>(null);
  useEffect(() => {
    const remember = (event: MouseEvent) => {
      last.current = { clientX: event.clientX, clientY: event.clientY };
    };
    document.addEventListener("mousemove", remember, { passive: true });
    return () => document.removeEventListener("mousemove", remember);
  }, []);
  return (event) => pointerMoved(last.current, event);
}
