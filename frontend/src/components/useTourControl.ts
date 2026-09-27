// Ofrece al tour guiado (D11 de docs/decisiones-diseno.md; spec 5.10) un
// estado propio del componente mientras está montado: la lupa del
// connectograma, el texto del buscador o las secciones de Filtros
// (state/tourControls.ts). El estado sigue siendo del componente; el tour solo
// lo lee al empezar, lo cambia con el mismo manejador que usa el componente y,
// al salir, lo deja como estaba.
import { useEffect, useRef } from "react";
import { registerTourControl, type TourControlKey, type TourControlValues } from "../state/tourControls";

export function useTourControl<K extends TourControlKey>(
  key: K,
  value: TourControlValues[K],
  set: (value: TourControlValues[K]) => void,
): void {
  // El valor y el manejador del último render, sin volver a ofrecer el
  // control en cada uno.
  const latest = useRef({ value, set });
  useEffect(() => {
    latest.current = { value, set };
  });
  useEffect(
    () => registerTourControl(key, { get: () => latest.current.value, set: (next) => latest.current.set(next) }),
    [key],
  );
}
