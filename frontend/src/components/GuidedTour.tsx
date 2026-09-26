// Tour guiado (D11 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.10): unos dos minutos con un ejemplo real en los que la app hace sola lo
// que explica. Solo se abre con el botón «?» de la barra. Mientras está
// abierto, lleva la caja de driver.js (components/tourDriver.ts) y el paso lo
// decide TourRunner (state/tourRunner.ts), con lo que App le da: su estado y
// sus manejadores. Al salir, el foco vuelve a «?» (onExit) y, con el montaje
// ya devuelto, App lo da por cerrado (onFinished).
//
// La región viva está siempre en la página: una que aparece con el texto ya
// dentro no siempre se anuncia (spec 5.7). Anuncia cada paso y las esperas.
import { useEffect, useRef } from "react";
import "driver.js/dist/driver.css";
import type { TourHost } from "../state/tourRunner";
import { startTour } from "./tourDriver";

interface GuidedTourProps {
  open: boolean;
  host: TourHost;
  onExit: () => void;
  onFinished: () => void;
}

export function GuidedTour({ open, host, onExit, onFinished }: GuidedTourProps) {
  const liveRef = useRef<HTMLDivElement>(null);
  // Lo de App en el último render: el tour lo lee cuando lo necesita.
  const latest = useRef({ host, onExit, onFinished });
  useEffect(() => {
    latest.current = { host, onExit, onFinished };
  });

  useEffect(() => {
    if (!open) return;
    const session = startTour({
      host: () => latest.current.host,
      live: liveRef.current,
      onExit: () => latest.current.onExit(),
      onFinished: () => latest.current.onFinished(),
    });
    return () => session.dispose();
  }, [open]);

  return <div ref={liveRef} className="visually-hidden" aria-live="polite" />;
}
