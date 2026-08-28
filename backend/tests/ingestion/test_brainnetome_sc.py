from pathlib import Path

import numpy as np
import pytest

from backend.ingestion.connectivity.brainnetome_sc import region_voxel_indices


def test_region_voxel_indices_excludes_background():
    atlas = np.array([[[0, 1], [2, 1]]])
    voxels = region_voxel_indices(atlas)
    assert set(voxels.keys()) == {1, 2}
    assert len(voxels[1]) == 2
    assert len(voxels[2]) == 1


_ATLAS_NII_PATH = Path.home() / "mnt" / "NeuroData" / "original" / "atlases" / "brainnetome" / "BN_Atlas_246_2mm.nii.gz"
_SC_NII_PATH = Path.home() / "mnt" / "NeuroData" / "original" / "atlases" / "brainnetome" / "BNA_SC_4D.nii.gz"
_XLSX_PATH = Path.home() / "mnt" / "NeuroData" / "original" / "atlases" / "brainnetome" / "BNA_subregions.xlsx"

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_ATLAS_NII_PATH.exists() and _SC_NII_PATH.exists() and _XLSX_PATH.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_structural_connections_against_real_files():
    from backend.ingestion.connectivity.brainnetome_sc import structural_connections

    conns = structural_connections(_ATLAS_NII_PATH, _SC_NII_PATH, _XLSX_PATH)
    # 246 regiones, un valor por cada par sin ordenar, sin la diagonal
    assert len(conns) == 246 * 245 // 2
    assert len({c.id for c in conns}) == len(conns)
    assert len({(c.source_id, c.target_id) for c in conns}) == len(conns)
    assert all(0.0 <= c.weight <= 1.0 for c in conns)
    # simetrizado real: el peso es la media de las dos direcciones, no una
    # de las dos sueltas
    assert all(
        abs(c.weight - (c.raw_forward + c.raw_backward) / 2.0) < 1e-9 for c in conns[:200]
    )
