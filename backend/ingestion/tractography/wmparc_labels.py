"""Nombres reales de las etiquetas del `wmparc` de FreeSurfer usado como
parcelación anatómica de la sección "nodos derivados de tractografía"
(decisión 66, 09/09/2026 -- petición de la usuaria: "hagamos una cuarta
pestaña con nodos derivados de tractografía... se seleccionan nodos y
el programa devuelve la tractografía que los une").

Fuente real del archivo de datos: `100HCP-population-mean-wmparc.nii.gz`
(O'Donnell Research Group / SlicerDMRI, Zenodo 10.5281/zenodo.8082481)
-- el mismo archivo ya verificado y cargado en la decisión 63 como malla
de fondo de `Tractography3D.tsx`, en el mismo espacio real que las
streamlines de ORG-800FC-100HCP (`org_atlas.REFERENCE_SPACE`, solape
empírico confirmado en esa decisión). Aquí se reutiliza ese mismo
archivo por segunda vez, ahora no para dibujar una superficie sino para
asignar cada extremo real de una streamline a una etiqueta anatómica
concreta (ver `hybrid_nodes.py`).

Los valores numéricos de etiqueta -> nombre están verificados, línea a
línea, contra `FreeSurferColorLUT.txt`, la tabla canónica del propio
FreeSurfer (comprobado dos veces contra fuentes primarias distintas,
09/09/2026): `github.com/freesurfer/freesurfer` (rama `dev`,
`distribution/FreeSurferColorLUT.txt`) para las estructuras subcorticales
y `surfer.nmr.mgh.harvard.edu/fswiki/.../FreeSurferColorLUT?action=raw`
para confirmar además las etiquetas "unknown" de la parcelación cortical
(1000/2000, ver `EXCLUDED_LABELS`). Nunca adivinado a partir del rango
numérico ni de la memoria -- exactamente el mismo criterio ya aplicado a
`TRACT_NAMES` en `org_atlas.py`.

Rangos reales de la parcelación de Desikan-Killiany (`aparc`), tal y
como los usa `wmparc` (ver `mri_wmparc` de FreeSurfer): 1000+código =
corteza del hemisferio izquierdo, 2000+código = corteza del hemisferio
derecho, 3000+código = sustancia blanca inmediatamente bajo la corteza
izquierda, 4000+código = ídem derecha -- mismo `código` numérico de
`DK_CORTICAL` en los cuatro casos, verificado contra el propio LUT (no
inventado a partir de "parece que sigue un patrón").
"""
from __future__ import annotations

# Verificado contra freesurfer/freesurfer (rama dev),
# distribution/FreeSurferColorLUT.txt, 09/09/2026.
SUBCORTICAL: dict[int, str] = {
    4: "Left-Lateral-Ventricle", 5: "Left-Inf-Lat-Vent",
    7: "Left-Cerebellum-White-Matter", 8: "Left-Cerebellum-Cortex",
    10: "Left-Thalamus", 11: "Left-Caudate", 12: "Left-Putamen", 13: "Left-Pallidum",
    14: "3rd-Ventricle", 15: "4th-Ventricle", 16: "Brain-Stem",
    17: "Left-Hippocampus", 18: "Left-Amygdala", 24: "CSF",
    26: "Left-Accumbens-area", 28: "Left-VentralDC", 30: "Left-vessel",
    31: "Left-choroid-plexus",
    43: "Right-Lateral-Ventricle", 44: "Right-Inf-Lat-Vent",
    46: "Right-Cerebellum-White-Matter", 47: "Right-Cerebellum-Cortex",
    49: "Right-Thalamus", 50: "Right-Caudate", 51: "Right-Putamen", 52: "Right-Pallidum",
    53: "Right-Hippocampus", 54: "Right-Amygdala", 58: "Right-Accumbens-area",
    60: "Right-VentralDC", 62: "Right-vessel", 63: "Right-choroid-plexus",
    85: "Optic-Chiasm",
    251: "CC_Posterior", 252: "CC_Mid_Posterior", 253: "CC_Central",
    254: "CC_Mid_Anterior", 255: "CC_Anterior",
    # Confirmado además contra un hilo real de la lista de correo de
    # FreeSurfer (freesurfer@nmr.mgh.harvard.edu) -- no aparecen en todas
    # las versiones publicadas del .txt con el mismo nombre exacto.
    5001: "Left-UnsegmentedWhiteMatter", 5002: "Right-UnsegmentedWhiteMatter",
}

# Los 34 nombres reales de la parcelación cortical de Desikan-Killiany,
# código local (1-34) -> nombre, tal y como los usa `wmparc` con el
# desplazamiento de rango (ver docstring del módulo). Código local 0
# ("unknown") NO está aquí a propósito -- ver EXCLUDED_LABELS.
DK_CORTICAL: dict[int, str] = {
    1: "bankssts", 2: "caudalanteriorcingulate", 3: "caudalmiddlefrontal",
    4: "corpuscallosum", 5: "cuneus", 6: "entorhinal", 7: "fusiform",
    8: "inferiorparietal", 9: "inferiortemporal", 10: "isthmuscingulate",
    11: "lateraloccipital", 12: "lateralorbitofrontal", 13: "lingual",
    14: "medialorbitofrontal", 15: "middletemporal", 16: "parahippocampal",
    17: "paracentral", 18: "parsopercularis", 19: "parsorbitalis",
    20: "parstriangularis", 21: "pericalcarine", 22: "postcentral",
    23: "posteriorcingulate", 24: "precentral", 25: "precuneus",
    26: "rostralanteriorcingulate", 27: "rostralmiddlefrontal", 28: "superiorfrontal",
    29: "superiorparietal", 30: "superiortemporal", 31: "supramarginal",
    32: "frontalpole", 33: "temporalpole", 34: "transversetemporal", 35: "insula",
}

# Hallazgo real, 09/09/2026: dos etiquetas (1000, 2000) SÍ aparecen en el
# wmparc real de este atlas (64 y 418 vóxeles respectivamente, de más de
# 800000 vóxeles reales con etiqueta -- comprobado exhaustivamente) pero
# NO son una estructura anatómica con límites propios: son el "código 0"
# de la propia parcelación de Desikan-Killiany, el vertedero de vértices
# corticales que el algoritmo de `aparc` no pudo asignar a ninguna de las
# 34 áreas reales de ese hemisferio -- verificado dos veces contra fuentes
# primarias distintas de FreeSurferColorLUT.txt (ver docstring del
# módulo): índice 1000 = "ctx-lh-unknown", 2000 = "ctx-rh-unknown".
# Cargarlas como nodo real de la pestaña de tractografía sería presentar
# un residuo sin clasificar como si fuera una región anatómica -- se
# excluyen siempre de `tractography_nodes` (y, en consecuencia, de
# `tractography_edges`: ninguna arista puede tocar un nodo que no existe),
# nunca en silencio: `hybrid_nodes.py` deja constancia real de cuántos
# vóxeles/streamlines quedan fuera por esto (decisión 66).
EXCLUDED_LABELS: dict[int, str] = {
    1000: "ctx-lh-unknown",
    2000: "ctx-rh-unknown",
}


class UnverifiedLabelError(ValueError):
    """Una etiqueta real del wmparc no tiene nombre verificado contra
    FreeSurferColorLUT -- nunca se inventa un nombre de repuesto (mismo
    criterio que el resto del proyecto, sección 24). No debería ocurrir
    contra el wmparc real ya verificado de este atlas (179 etiquetas
    reales, las 178 con voxeles reales todas cubiertas por este módulo
    salvo las dos de EXCLUDED_LABELS) -- si ocurre, es una señal real de
    que el archivo de entrada no es el esperado."""


def label_name(label_id: int) -> str:
    """Nombre anatómico real verificado de una etiqueta del wmparc.
    Lanza `UnverifiedLabelError` para una etiqueta de `EXCLUDED_LABELS`
    (nunca debe llamarse `label_name` para esas -- compruébalas antes con
    `label_id in EXCLUDED_LABELS`) o para cualquier etiqueta sin nombre
    verificado -- nunca devuelve un nombre inventado ni un marcador de
    posición silencioso."""
    if label_id in EXCLUDED_LABELS:
        raise UnverifiedLabelError(
            f"la etiqueta {label_id} ({EXCLUDED_LABELS[label_id]}) es un "
            "residuo sin clasificar de la parcelación, no una región real "
            "-- nunca se convierte en nodo (ver EXCLUDED_LABELS)"
        )
    if label_id in SUBCORTICAL:
        return SUBCORTICAL[label_id]
    if 1000 <= label_id <= 1035 and (label_id - 1000) in DK_CORTICAL:
        return f"ctx-lh-{DK_CORTICAL[label_id - 1000]}"
    if 2000 <= label_id <= 2035 and (label_id - 2000) in DK_CORTICAL:
        return f"ctx-rh-{DK_CORTICAL[label_id - 2000]}"
    if 3000 <= label_id <= 3035 and (label_id - 3000) in DK_CORTICAL:
        return f"wm-lh-{DK_CORTICAL[label_id - 3000]}"
    if 4000 <= label_id <= 4035 and (label_id - 4000) in DK_CORTICAL:
        return f"wm-rh-{DK_CORTICAL[label_id - 4000]}"
    raise UnverifiedLabelError(
        f"etiqueta wmparc {label_id} sin nombre verificado contra "
        "FreeSurferColorLUT -- revisar si el archivo de entrada es de "
        "verdad 100HCP-population-mean-wmparc.nii.gz"
    )
