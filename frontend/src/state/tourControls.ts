// Controles del tour guiado (D11 de docs/decisiones-diseno.md; spec 5.10): lo
// que el tour enciende, escribe o despliega dentro de un componente, donde es
// estado propio del componente y no de un store. Cada componente ofrece el
// suyo mientras está montado (components/useTourControl.ts), y el tour lo lee
// al empezar, lo cambia y, al salir, lo deja como estaba. Si el componente no
// está en la página, no hay control: con Filtros plegado no hay buscador.
import type { TourSections } from "../logic/tourRestore";

export interface TourControlValues {
  // La lupa del connectograma (Connectogram).
  lupa: boolean;
  // El texto del buscador de regiones (RegionSearch).
  buscador: string;
  // Las secciones plegables de Filtros (FilterPanel).
  secciones: TourSections;
}
export type TourControlKey = keyof TourControlValues;

export interface TourControl<K extends TourControlKey> {
  get(): TourControlValues[K];
  set(value: TourControlValues[K]): void;
}

type Registry = { [K in TourControlKey]?: TourControl<K> };
const registry: Registry = {};

// Lo ofrece un componente al montarse; devuelve con qué retirarlo al
// desmontarse. Solo se retira si sigue siendo el mismo: con StrictMode, el
// montaje de prueba no se lleva el definitivo.
export function registerTourControl<K extends TourControlKey>(key: K, control: TourControl<K>): () => void {
  (registry as Record<K, TourControl<K> | undefined>)[key] = control;
  return () => {
    if (registry[key] === control) delete registry[key];
  };
}

export function tourControl<K extends TourControlKey>(key: K): TourControl<K> | undefined {
  return (registry as Record<K, TourControl<K> | undefined>)[key];
}
