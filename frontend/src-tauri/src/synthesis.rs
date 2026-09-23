// Comando Tauri para la función "Importar síntesis de IA" (decisión 71
// de docs/analisis-arquitectura.md, 11/09/2026): permite abrir, mediante
// el diálogo nativo de archivos (@tauri-apps/plugin-dialog, en el
// frontend), un archivo JSON generado por un asistente de IA (esta
// misma sesión, Claude Desktop, u otro) que propone qué regiones/redes
// YA CARGADAS REALMENTE en NeuroGraph la literatura científica asocia a
// una función cognitiva concreta -- ver docs/protocolo-sintesis-ia.md
// para el esquema completo y las reglas que debe seguir quien construya
// ese archivo.
//
// Deliberadamente NO se usa @tauri-apps/plugin-fs para esta lectura:
// ese plugin exige declarar de antemano, en capabilities/default.json,
// el alcance de rutas que puede leer -- pero la ruta real aquí la elige
// la propia usuaria en el momento, con el diálogo nativo, así que no hay
// ningún alcance fijo razonable que declarar sin volverlo o bien
// demasiado amplio (todo el disco) o bien inútil (una carpeta fija que
// obligaría a copiar el archivo antes de importarlo). Un comando propio
// en Rust que solo lee, en texto, la ruta exacta que ya devolvió el
// diálogo nativo evita ambos problemas: la superficie concedida es
// "puede leer el archivo que la usuaria ya eligió explícitamente",
// nunca "puede leer cualquier archivo del disco".
//
// Este comando NUNCA interpreta el contenido del archivo -- se limita a
// devolver el texto tal cual está en disco. Toda la validación real
// (cada region_id contra las regiones REALMENTE cargadas del atlas
// activo en ese momento, cada cita con sus campos obligatorios, cada
// referencia cruzada entre hallazgos) ocurre en el frontend
// (frontend/src/logic/synthesisValidation.ts), nunca aquí ni en
// ninguna otra parte de Rust -- mismo principio que el resto del
// proyecto: nunca confiar en un archivo externo sin revalidarlo contra
// el propio estado real de la aplicación (sección 24).
#[tauri::command]
pub fn read_synthesis_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("No se pudo leer '{path}': {e}"))
}
