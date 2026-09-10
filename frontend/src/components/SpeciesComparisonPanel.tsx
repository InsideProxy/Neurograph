// Panel de comparación real entre especies (decisión 38, 01/09/2026):
// selecciona dos especies reales y muestra dentro de la propia ventana
// de NeuroGraph las tres imágenes de `GET /render/species/*` -- antes
// había que abrir cada URL a mano en el navegador. Reutiliza
// íntegramente la capa de servicio del backend (species_service,
// species_render_service): este componente nunca calcula nada por su
// cuenta, solo pide y muestra lo que la API ya calculó.
import { useEffect, useState } from "react";
import {
  fetchSpeciesComparisonImage,
  fetchSpeciesList,
  type SpeciesComparisonImageKind,
  type SpeciesListItem,
} from "../data/speciesApi";

type SpeciesListState = { kind: "loading" } | { kind: "error" } | { kind: "loaded"; items: SpeciesListItem[] };

type ImageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; objectUrl: string };

const IMAGE_PANELS: { key: SpeciesComparisonImageKind; title: string }[] = [
  { key: "homology-connectogram", title: "Connectograma de homología" },
  { key: "hemisphere-a", title: "Esquema interhemisférico — especie A" },
  { key: "hemisphere-b", title: "Esquema interhemisférico — especie B" },
];

export function SpeciesComparisonPanel() {
  const [speciesList, setSpeciesList] = useState<SpeciesListState>({ kind: "loading" });
  const [speciesAId, setSpeciesAId] = useState("");
  const [speciesBId, setSpeciesBId] = useState("");
  const [images, setImages] = useState<Partial<Record<SpeciesComparisonImageKind, ImageState>>>({});

  useEffect(() => {
    let cancelled = false;
    fetchSpeciesList()
      .then((items) => {
        if (cancelled) return;
        setSpeciesList({ kind: "loaded", items });
        // Primera vez: preselecciona las dos primeras especies reales
        // distintas, para que el panel muestre algo sin que la usuaria
        // tenga que elegir manualmente antes de ver cómo funciona.
        if (items.length >= 2) {
          setSpeciesAId(items[0].id);
          setSpeciesBId(items[1].id);
        }
      })
      .catch(() => {
        if (!cancelled) setSpeciesList({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!speciesAId || !speciesBId || speciesAId === speciesBId) {
      setImages({});
      return;
    }
    let cancelled = false;
    const objectUrls: string[] = [];

    setImages(Object.fromEntries(IMAGE_PANELS.map(({ key }) => [key, { kind: "loading" }])));

    for (const { key } of IMAGE_PANELS) {
      fetchSpeciesComparisonImage(key, speciesAId, speciesBId)
        .then((blob) => {
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          setImages((prev) => ({ ...prev, [key]: { kind: "loaded", objectUrl } }));
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "error desconocido";
          setImages((prev) => ({ ...prev, [key]: { kind: "error", message } }));
        });
    }

    return () => {
      cancelled = true;
      // Los blobs solo viven en memoria del navegador -- hay que
      // liberarlos explícitamente al cambiar de par de especies o
      // desmontar el panel, o si no se acumulan sin límite.
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    };
  }, [speciesAId, speciesBId]);

  if (speciesList.kind === "loading") {
    return <p className="species-panel__status">Cargando especies reales…</p>;
  }
  if (speciesList.kind === "error" || speciesList.items.length === 0) {
    return (
      <p className="species-panel__status species-panel__status--error">
        No se pudo cargar la lista de especies reales. ¿Está la API levantada? (docker compose up -d)
      </p>
    );
  }
  if (speciesList.items.length < 2) {
    return (
      <p className="species-panel__status species-panel__status--error">
        Solo hay una especie real cargada con regiones ({speciesList.items[0].scientificName}) -- hace falta una
        segunda especie para poder comparar.
      </p>
    );
  }

  const speciesOptions = speciesList.items.map((s) => (
    <option key={s.id} value={s.id}>
      {s.scientificName} ({s.regionCount} regiones)
    </option>
  ));

  return (
    <div className="species-panel">
      <p className="species-panel__help">
        El <strong>connectograma de homología</strong> (primera imagen) reúne en un solo círculo
        todas las regiones reales de las dos especies, la mitad izquierda para la especie A y la
        derecha para la especie B: los puntos de color neutro son exclusivos de cada especie, los
        puntos resaltados son las regiones que sí tienen una homología real con la otra especie, y
        cada línea que cruza el círculo es una homología real entre un par concreto de regiones
        (nunca todas las combinaciones posibles). Los dos <strong>esquemas interhemisféricos</strong>
        (las otras dos imágenes) muestran cada especie por separado, en su propia anatomía real —
        sus posiciones no se pueden comparar en tamaño ni escala entre una imagen y la otra. Ahí el
        color identifica el PAR homólogo (una región y su contraparte real en la otra especie
        comparten el mismo color en las dos imágenes — así se detecta a simple vista qué corresponde
        con qué), y la forma del punto (círculo, cuadrado o triángulo) indica el hemisferio real de
        esa región, nunca el color. Las tres imágenes ya incluyen su propia leyenda de colores y
        formas dibujada en la esquina.
      </p>
      <div className="species-panel__selectors">
        <label>
          Especie A:{" "}
          <select value={speciesAId} onChange={(e) => setSpeciesAId(e.target.value)}>
            {speciesOptions}
          </select>
        </label>
        <label>
          Especie B:{" "}
          <select value={speciesBId} onChange={(e) => setSpeciesBId(e.target.value)}>
            {speciesOptions}
          </select>
        </label>
      </div>

      {speciesAId === speciesBId ? (
        <p className="species-panel__status species-panel__status--error">
          Elige dos especies distintas para comparar.
        </p>
      ) : (
        <div className="species-panel__images">
          {IMAGE_PANELS.map(({ key, title }) => {
            const state = images[key];
            return (
              <figure key={key} className="species-panel__figure">
                <figcaption>{title}</figcaption>
                {(!state || state.kind === "loading") && (
                  <p className="species-panel__status">Generando…</p>
                )}
                {state?.kind === "error" && (
                  <p className="species-panel__status species-panel__status--error">{state.message}</p>
                )}
                {state?.kind === "loaded" && <img src={state.objectUrl} alt={title} />}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
