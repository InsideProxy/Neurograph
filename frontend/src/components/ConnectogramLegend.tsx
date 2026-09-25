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

// Las muestras de las dos líneas, como las líneas del dibujo: 1 px, el grosor
// de casi todas (Connectogram.tsx: el peso por 6, y 1 como poco), y extremos
// rectos (butt). Con los redondos y 1,6 px de las demás muestras, cada trazo
// del discontinuo crecía 0,8 px por cada lado y se comía los huecos: con el
// «3 3» de los temas 2 a 4, bajaban de 3 px a 1,4. La flecha y el punto
// conservan su trazo, más visible.
const LINE_SAMPLE_WIDTH = 1;

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
  // role="list": con list-style: none, Safari deja de anunciarla como lista.
  return (
    <ul className="connectogram-legend" role="list" aria-label="Leyenda del connectograma">
      <li>
        <Sample>
          <path d="M1 4H25" strokeDasharray={dash} strokeWidth={LINE_SAMPLE_WIDTH} strokeLinecap="butt" />
        </Sample>
        Evidencia no directa (indirecta o hipótesis)
      </li>
      <li>
        <Sample>
          <path d="M1 4H25" strokeWidth={LINE_SAMPLE_WIDTH} strokeLinecap="butt" />
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
