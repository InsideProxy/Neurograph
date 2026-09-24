// Colores de dibujo (SVG y 3D) del tema activo (D3 de docs/decisiones-diseno.md). forExport:
// los de la exportación (docs/rediseno-interfaz-diseno.md, 4.4). Solo lo
// usa Brain3D, con su estado local «exportando».
import { useMemo } from "react";
import { useAppearanceStore } from "../state/appearance";
import { resolveNetworkColor } from "./colors";
import { DRAW_TOKENS, exportDrawTokens, type DrawTokens, type ThemeId } from "./themes";

export interface DrawColors extends DrawTokens {
  networkColor: (key: string) => string;
}

export function drawColorsFor(theme: ThemeId, forExport = false): DrawColors {
  const tokens = forExport ? exportDrawTokens(theme) : DRAW_TOKENS[theme];
  return { ...tokens, networkColor: resolveNetworkColor };
}

export function useDrawColors(forExport = false): DrawColors {
  const theme = useAppearanceStore((state) => state.theme);
  return useMemo(() => drawColorsFor(theme, forExport), [theme, forExport]);
}
