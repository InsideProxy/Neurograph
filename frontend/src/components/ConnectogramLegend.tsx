// Leyenda del connectograma (docs/rediseno-interfaz-diseno.md, 5.4; fase 4
// del rediseño): lo que dicen las líneas (discontinua, continua y con
// flecha) y el color de los puntos, la codificación del principio 1 del
// spec. Va abajo a la izquierda de la vista grande, bajo el dibujo y fuera
// del <svg>, así que no se exporta y nunca tapa nodos (decisión del usuario
// del 25/09/2026: encima del dibujo, como en la maqueta, tapaba una docena
// de nodos a 1400 × 900, y también la lupa). Las muestras son del color del
// texto, y la discontinua lleva el discontinuo del tema (token dash), el de
// las líneas del dibujo.
import type { ReactNode } from "react";

function Sample({ children }: { children: ReactNode }) {
  return (
    <svg
      className="connectogram-legend__sample"
      width="26"
      height="8"
      viewBox="0 0 26 8"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ConnectogramLegend({ dash }: { dash: string }) {
  return (
    <ul className="connectogram-legend" aria-label="Leyenda del connectograma">
      <li>
        <Sample>
          <path d="M1 4H25" strokeDasharray={dash} />
        </Sample>
        Evidencia no directa (indirecta o hipótesis)
      </li>
      <li>
        <Sample>
          <path d="M1 4H25" />
        </Sample>
        Evidencia directa
      </li>
      <li>
        <Sample>
          <path d="M1 4H22 M18 1l4 3-4 3" />
        </Sample>
        Efectiva (con dirección)
      </li>
      <li>
        <Sample>
          <circle cx="4" cy="4" r="2.5" />
          <path d="M8 4H25" />
        </Sample>
        Color del punto = red
      </li>
    </ul>
  );
}
