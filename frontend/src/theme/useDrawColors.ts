// Colores de dibujo (SVG y 3D) del tema y de la paleta de redes activos (D3
// de docs/decisiones-diseno.md y fase 2 del rediseño). forExport: los de la
// exportación (docs/rediseno-interfaz-diseno.md, 4.4). Solo lo usa Brain3D,
// con su estado local «exportando».
import { useMemo } from "react";
import { useAppearanceStore } from "../state/appearance";
import {
  effectivePaletteMode,
  exportNetworkColor,
  exportResolverFor,
  resolveNetworkColor,
  type ExportAttributeKind,
  type PaletteMode,
} from "./colors";
import { DRAW_TOKENS, exportDrawTokens, type DrawTokens, type ThemeId } from "./themes";

export interface DrawColors extends DrawTokens {
  networkColor: (key: string) => string;
}

// mode: el modo de paleta que se aplica (effectivePaletteMode). Con
// forExport, los colores de red son los de la exportación, los mismos que
// exportColorFor da a los SVG: con «Suaves», la columna de Claro.
export function drawColorsFor(theme: ThemeId, mode: PaletteMode, forExport = false): DrawColors {
  if (forExport) return { ...exportDrawTokens(theme), networkColor: (key) => exportNetworkColor(key, mode) };
  return { ...DRAW_TOKENS[theme], networkColor: (key) => resolveNetworkColor(key, theme, mode) };
}

export function useDrawColors(forExport = false): DrawColors {
  const theme = useAppearanceStore((state) => state.theme);
  const paletteMode = useAppearanceStore((state) => state.paletteMode);
  const mode = effectivePaletteMode(theme, paletteMode);
  return useMemo(() => drawColorsFor(theme, mode, forExport), [theme, mode, forExport]);
}

// Resolvedor de la exportación de los SVG (4.4), con el tema y la paleta de
// ese momento: se llama al pulsar «Exportar JPEG», no al dibujar. Es el
// único sitio que lee los dos del store para exportar; el 3D llega a los
// mismos colores con useDrawColors(true).
export function currentExportResolver(): (ref: string, kind: ExportAttributeKind) => string | null {
  const { theme, paletteMode } = useAppearanceStore.getState();
  return exportResolverFor(theme, effectivePaletteMode(theme, paletteMode));
}
