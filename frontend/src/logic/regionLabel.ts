// Cuándo mostrar la abreviatura de una región por separado del nombre
// completo en un recuadro de lectura (Connectogram.tsx, Hemisferios.tsx,
// DetailPanel.tsx) -- corrige un problema real reportado por la usuaria
// el 30/08/2026: en HCP-MMP1.0, la etiqueta de origen (CIFTI) no trae
// más que el código de área ("V1", "9-46d"...) -- no existe, en los
// archivos que se han ingerido hasta ahora, un nombre anatómico
// descriptivo distinto (eso exigiría ingerir además la tabla
// suplementaria de Glasser et al. 2016, que no se ha hecho todavía). Por
// eso `region_name()` en
// `backend/ingestion/neuroimaging/hcp_mmp1.py` construye el campo
// `name` como `"{area_code} (hemisferio {lado})"` -- el mismo código,
// con el hemisferio al lado, NUNCA un nombre inventado. El dato es
// honesto, pero mostrar "V1 — V1 (hemisferio izquierdo)" en el recuadro
// de lectura repite la misma información dos veces sin decir nada
// nuevo. Los otros tres atlas (Gordon 333, Brainnetome, subcórtex del
// HCP) sí construyen un `name` genuinamente distinto de la abreviatura,
// así que esto no puede resolverse ocultando la abreviatura siempre --
// solo cuando el nombre completo ya empieza literalmente por ella.
export function abbreviationAddsInformation(node: {
  abbreviation: string | null;
  label: string;
}): boolean {
  if (!node.abbreviation) return false;
  return !node.label.startsWith(node.abbreviation);
}
