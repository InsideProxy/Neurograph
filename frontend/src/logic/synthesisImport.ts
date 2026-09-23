// Puente con Tauri para "Importar síntesis de IA" (decisión 71):
// abre el diálogo nativo de selección de archivo y lee su contenido con
// el comando propio de Rust `read_synthesis_file`
// (frontend/src-tauri/src/synthesis.rs) -- nunca con
// @tauri-apps/plugin-fs, ver el comentario de cabecera de ese archivo
// para el porqué. Este módulo solo mueve bytes; la validación real del
// contenido vive en synthesisValidation.ts, nunca aquí.
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export interface PickedSynthesisFile {
  path: string;
  content: string;
}

// `null` cuando la usuaria cierra el diálogo sin elegir nada -- un
// cierre sin elección nunca se trata como un error.
export async function pickAndReadSynthesisFile(): Promise<PickedSynthesisFile | null> {
  const picked = await open({
    multiple: false,
    directory: false,
    title: "Importar síntesis de IA generada por un asistente",
    filters: [{ name: "Síntesis de IA (JSON)", extensions: ["json"] }],
  });
  if (picked === null || Array.isArray(picked)) {
    return null;
  }
  const content = await invoke<string>("read_synthesis_file", { path: picked });
  return { path: picked, content };
}
