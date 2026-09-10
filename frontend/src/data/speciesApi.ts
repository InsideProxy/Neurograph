// Comparación real entre especies (Fase 10, sección 16/20-21): lista de
// especies reales y las tres imágenes PNG de `backend/api/routers/
// species_render.py` (decisión 38, 01/09/2026 -- panel dentro de la
// propia ventana de escritorio, en vez de pegar tres URLs a mano en el
// navegador).
import { API_BASE_URL } from "./api";

export interface SpeciesListItem {
  id: string;
  name: string;
  scientificName: string;
  // Total de regiones reales cargadas de esta especie (cualquier atlas)
  // -- viene de GET /species, backend/api/services/species_service.py.
  regionCount: number;
}

interface ApiSpeciesListItem {
  id: string;
  name: string;
  scientific_name: string;
  region_count: number;
}

// Solo especies con al menos una región real cargada (así las devuelve
// GET /species) -- nunca una especie vacía que solo confundiría en el
// desplegable.
export async function fetchSpeciesList(): Promise<SpeciesListItem[]> {
  const response = await fetch(new URL("/species", API_BASE_URL).toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiSpeciesListItem[] = await response.json();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    scientificName: row.scientific_name,
    regionCount: row.region_count,
  }));
}

export type SpeciesComparisonImageKind = "homology-connectogram" | "hemisphere-a" | "hemisphere-b";

// Cada imagen se pide como blob (no como <img src="...">) para poder
// leer el mensaje real de error cuando la API devuelve 404 -- p. ej.
// "no comparten ninguna homología real" (species_render_service.py) --
// en vez de mostrar solo un icono de imagen rota sin explicación.
export async function fetchSpeciesComparisonImage(
  kind: SpeciesComparisonImageKind,
  speciesAId: string,
  speciesBId: string,
): Promise<Blob> {
  const url = new URL(`/render/species/${kind}`, API_BASE_URL);
  url.searchParams.set("species_a_id", speciesAId);
  url.searchParams.set("species_b_id", speciesBId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    let detail = `la API respondió ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // Cuerpo no-JSON (p. ej. el 404 genérico de FastAPI cuando la ruta
      // no existe en absoluto) -- se deja el mensaje por defecto.
    }
    throw new Error(detail);
  }
  return response.blob();
}
