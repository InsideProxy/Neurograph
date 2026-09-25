// Etiqueta de una región marcada (docs/rediseno-interfaz-diseno.md, 5.9) en
// el connectograma y los hemisferios: la abreviatura, con el color de texto
// de marca, sobre una pastilla del color de marca. Se dibuja encima de la
// etiqueta de siempre, que se queda debajo tal cual para la exportación:
// todo el grupo lleva data-ng-mark, y exportSvgAsJpeg lo quita del clon.
//
// La pastilla es un rectángulo de extremos redondos con el mismo transform
// que el texto, así que gira con él (en la lupa, las etiquetas van giradas).
// Se descartó el halo (un trazo grueso del color de marca alrededor de las
// letras): su borde sigue la forma de las letras, con muescas sobre las
// minúsculas, y no se ve como una pastilla. El rectángulo necesita el ancho
// del texto: se pinta con uno estimado (logic/marks.ts) y, antes de que el
// navegador lo muestre, un efecto de layout mide la caja real del texto con
// getBBox, que no cuenta el giro, y ajusta el rectángulo directamente en el
// DOM, sin volver a pintar con React. En node, sin DOM, queda la estimación.
import { useLayoutEffect, useRef } from "react";
import { MARK_ELEMENT, estimatedTextBox, pillAround, type TextAnchor } from "../logic/marks";

interface MarkedLabelProps {
  text: string;
  x: number;
  y: number;
  anchor: TextAnchor;
  fontSize: number;
  fontWeight: number;
  // El giro del texto, si lo lleva: la pastilla lleva el mismo.
  transform?: string;
  colors: { mark: string; markText: string };
}

export function MarkedLabel({ text, x, y, anchor, fontSize, fontWeight, transform, colors }: MarkedLabelProps) {
  const pillRef = useRef<SVGRectElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const estimate = pillAround(estimatedTextBox(text, x, y, anchor, fontSize), fontSize);

  // En cada pintado, porque el texto, su tamaño o su sitio pueden haber
  // cambiado (al pasar el ratón, el nodo crece). Son pocas etiquetas: las de
  // las regiones marcadas.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const label = textRef.current;
    if (!pill || !label) return;
    let box: DOMRect;
    try {
      box = label.getBBox();
    } catch {
      // Sin maqueta (por ejemplo, con el dibujo oculto) no se puede medir:
      // se queda la estimación.
      return;
    }
    if (box.width === 0) return;
    const measured = pillAround(box, fontSize);
    pill.setAttribute("x", String(measured.x));
    pill.setAttribute("y", String(measured.y));
    pill.setAttribute("width", String(measured.width));
    pill.setAttribute("height", String(measured.height));
    pill.setAttribute("rx", String(measured.rx));
  });

  return (
    <g {...MARK_ELEMENT} style={{ pointerEvents: "none" }}>
      <rect
        ref={pillRef}
        x={estimate.x}
        y={estimate.y}
        width={estimate.width}
        height={estimate.height}
        rx={estimate.rx}
        transform={transform}
        fill={colors.mark}
      />
      <text
        ref={textRef}
        x={x}
        y={y}
        transform={transform}
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={fontWeight}
        fill={colors.markText}
      >
        {text}
      </text>
    </g>
  );
}
