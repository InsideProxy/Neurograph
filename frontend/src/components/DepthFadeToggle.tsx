// Interruptor «Atenuar lo que queda detrás» de los controles del cerebro 3D
// (Legibilidad del 3D; docs/rediseno-interfaz-diseno.md, 6.3). Es un botón
// de alternar (aria-pressed) con el estilo de los botones de herramienta:
// .export-btn, y .export-btn--active cuando está activado, que toman sus
// colores del tema.
//
// Va dentro de su propio contenedor para no ser hijo directo de
// .brain3d-toolbar: la regla `.brain3d-toolbar > .export-btn` es la del
// botón de exportar, y la fase 3 lo coloca con ella en la cabecera de la
// vista.
export function DepthFadeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="brain3d-depth-fade">
      <button
        type="button"
        className={enabled ? "export-btn export-btn--active" : "export-btn"}
        aria-pressed={enabled}
        title="Las líneas, los marcadores y las etiquetas se ven más tenues cuanto más lejos quedan dentro del cerebro"
        onClick={onToggle}
      >
        Atenuar lo que queda detrás
      </button>
    </div>
  );
}
