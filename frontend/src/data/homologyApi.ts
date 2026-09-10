// Cliente de `GET /homologies` (backend/api/routers/homologies.py, Fase
// 10, decisión 34) -- usado por Brain3D.tsx (02/09/2026) para resaltar
// en un segundo color las regiones con homología real ya cargada hacia
// una especie de comparación elegida por la usuaria. Mismo patrón que
// speciesApi.ts: `fetch` -> `!response.ok` lanza -> tipo interno
// snake_case -> `.map()` a la forma pública camelCase.
import { API_BASE_URL } from "./api";

export interface HomologyRegionRef {
  id: string;
  name: string;
  speciesId: string;
  speciesScientificName: string;
}

export interface HomologyCitation {
  id: string;
  name: string;
  doi: string | null;
  year: number | null;
}

export interface HomologyMatch {
  id: string;
  // candidate_homology | confirmed_homology | analogy | similarity |
  // functional_correspondence | uncertain_correspondence (nunca
  // colapsado -- mismo dato real que expone el backend).
  status: string;
  confidence: number | null;
  method: string | null;
  source: HomologyRegionRef;
  target: HomologyRegionRef;
  studies: HomologyCitation[];
}

interface ApiHomologyRegion {
  id: string;
  name: string;
  species_id: string;
  species_scientific_name: string;
}

interface ApiHomologyCitation {
  id: string;
  name: string;
  doi: string | null;
  year: number | null;
}

interface ApiHomologyMatch {
  id: string;
  status: string;
  confidence: number | null;
  method: string | null;
  source: ApiHomologyRegion;
  target: ApiHomologyRegion;
  studies: ApiHomologyCitation[];
}

function mapRegion(region: ApiHomologyRegion): HomologyRegionRef {
  return {
    id: region.id,
    name: region.name,
    speciesId: region.species_id,
    speciesScientificName: region.species_scientific_name,
  };
}

// Sin filtro de región: queremos TODAS las homologías reales que tocan
// la especie de comparación elegida, sin importar a qué región concreta
// del atlas actual pudieran corresponder -- es Brain3D.tsx quien decide
// después, nodo a nodo, cuáles de esos ids coinciden con lo que ya tiene
// cargado (ver homologyRegionIds más abajo).
export async function fetchHomologiesForSpecies(speciesId: string): Promise<HomologyMatch[]> {
  const url = new URL("/homologies", API_BASE_URL);
  url.searchParams.set("species_id", speciesId);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiHomologyMatch[] = await response.json();
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    confidence: row.confidence,
    method: row.method,
    source: mapRegion(row.source),
    target: mapRegion(row.target),
    studies: row.studies.map((s) => ({ id: s.id, name: s.name, doi: s.doi, year: s.year })),
  }));
}

// Conjunto de ids de región reales que aparecen en al menos un extremo
// (source o target) de esta lista de homologías -- deliberadamente sin
// suponer qué especie es "la actual" en pantalla: da igual si el id
// pertenece al lado humano o al lado de la especie de comparación, así
// que a quien llama (Brain3D.tsx) le basta comprobar `.has(node.id)`
// sobre los nodos que ya tiene cargados, sean de la especie que sean.
export function homologyRegionIds(matches: HomologyMatch[]): Set<string> {
  const ids = new Set<string>();
  for (const match of matches) {
    ids.add(match.source.id);
    ids.add(match.target.id);
  }
  return ids;
}
