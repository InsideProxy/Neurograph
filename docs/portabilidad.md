# Principio de portabilidad (sección 26 de la especificación)

La instalación de NeuroGraph (este repositorio) y la biblioteca de datos
científicos (el SSD, típicamente `NeuroData/`) son independientes y deben
poder viajar por separado:

```
ORDENADOR
└── NeuroGraph/          (este repositorio: código, sin datos científicos)

SSD
└── NeuroData/
    ├── original/        (nunca se modifica)
    └── derived/         (reconstruible a partir de original/)
```

Cada biblioteca lleva un manifiesto `.neurograph_library.yaml` en su raíz
(ver `backend/library/manifest.py`) que la identifica de forma estable,
independiente de en qué unidad o ruta esté montada. Al conectar una
biblioteca: se detecta el manifiesto → se verifica su integridad → se
indexa en la base de datos local. Los índices son reconstruibles; los
datos originales, no.

**Nota para este proyecto en particular:** de momento el código
(`E:\Neurograph`) y la futura biblioteca de datos conviven en la misma
unidad física (E:). Es una decisión de partida válida — la arquitectura
no depende de que estén en discos distintos — pero conviene recordar que
son, conceptualmente, dos cosas separadas.

## ¿Zip o descomprimido? — los dos, con roles distintos

Cuando un dataset original llega comprimido (p. ej. un `.zip` descargado de un atlas), **no se descomprime en el sitio**: el zip se queda intacto en `original/`, tal cual se descargó, con su checksum — es la prueba exacta de lo que se obtuvo de la fuente, y lo que se vuelve a comprobar si algún día hay dudas de que algo se haya corrompido. Las herramientas de neuroimagen, en cambio, no leen bien archivos sueltos desde dentro de un zip, así que para trabajar de verdad con los datos se genera una copia descomprimida en `derived/extracted/<nombre_del_dataset>/` — es un dato derivado como cualquier otro (100% regenerable a partir del original, con su propio `dataset.yaml` enlazado vía `derived_from`), no una copia de trabajo sin registrar.

Ejemplo real (Fase 2, HCP S1200):

```
NeuroData/
├── original/atlases/hcp_s1200_groupavg/
│   ├── HCP_S1200_Atlas_Z4_pkXDZ.zip      (intacto, con checksum)
│   └── dataset.yaml                       (id: ...s1200_groupavg)
└── derived/extracted/hcp_s1200_groupavg/
    ├── HCP_S1200_Atlas_Z4_pkXDZ/*.nii...  (archivos sueltos, listos para leer)
    └── dataset.yaml                       (id: ...s1200_groupavg_extracted,
                                             derived_from: ...s1200_groupavg)
```
