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
