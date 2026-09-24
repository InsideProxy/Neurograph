// Iconos SVG en línea (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 9). Son los trazos de 24×24 de la
// maqueta de Claude Design, dibujados con el color del texto
// (currentColor), así que siguen al tema sin ningún color propio. Son
// siempre decorativos (aria-hidden): el nombre accesible lo da el control
// que los lleva.
const PATHS = {
  // Pestañas de vista.
  atlas: "M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M6.3 7.2 17.7 16.8 M6.3 16.8 17.7 7.2",
  species: "M3 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M9 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0",
  tracts: "M3 18c4-8 8-12 18-12 M3 13c5-4 9-6 18-6 M3 8c6 0 10 4 18 10",
  nodes:
    "M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  // Matraz de las pestañas de síntesis de IA: sustituye al emoji 🧪.
  synthesis: "M9 3h6 M10 3v5.5L4.8 18a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 8.5V3 M7.3 15h9.4",
  // Acciones.
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  search: "M4 11a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3",
  expand: "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
  target:
    "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0",
  plus: "M5 12h14 M12 5v14",
  copy: "M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  check: "M20 6 9 17l-5-5",
  close: "M18 6 6 18 M6 6l12 12",
  // Deshacer y rehacer (Task 10).
  undo: "M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  redo: "M15 14l5-5-5-5 M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  // Flechas.
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M18 15l-6-6-6 6",
  chevronsLeft: "M11 17l-5-5 5-5 M18 17l-5-5 5-5",
  chevronsRight: "M13 17l5-5-5-5 M6 17l5-5-5-5",
  arrowRight: "M5 12h14 M12 5l7 7-7 7",
  // Carga en curso: un arco que App.css hace girar.
  spinner: "M21 12a9 9 0 1 1-6.2-8.6",
  // Avisos y ayuda.
  info: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 16v-4 M12 8h.01",
  alert: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 8v4 M12 16h.01",
  help: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
