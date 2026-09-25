# CLAUDE.md — NeuroGraph

Estas reglas se aplican a toda tarea en este repositorio, salvo que se diga lo contrario.
Sesgo: cautela antes que velocidad en el trabajo no trivial.

## Reglas de trabajo

1. **Pensar antes de programar.** Decir los supuestos. Preguntar antes que adivinar. Si hay una vía más simple, decirlo. Parar si algo no cuadra.
2. **Simplicidad.** El mínimo código que resuelve el problema. Nada especulativo ni abstracciones para un solo uso.
3. **Cambios quirúrgicos.** Tocar solo lo necesario, con el estilo del código de alrededor. No mejorar código vecino ni refactorizar lo que funciona.
4. **Criterio de éxito verificable.** Definir cómo se comprueba que está hecho y comprobarlo.
5. **La IA interpreta, no es el motor científico.** Ni en el producto ni al trabajar: si el código o los datos pueden responder, responden ellos. La IA nunca inventa conexiones, homologías ni evidencia.
6. **Coste consciente.** Buscar antes de leer archivos enteros (el log pesa ~400 KB: buscar por número de decisión). Delegar barridos amplios a subagentes. Si el alcance se dispara, decirlo y pedir criterio; nunca recortar en silencio.
7. **Señalar contradicciones, no promediarlas.** Si dos criterios chocan, elegir uno (el más reciente o el más probado), explicar por qué y señalar el otro.
8. **Leer antes de escribir.** Revisar llamadas, utilidades compartidas y el criterio del área. Si no se entiende por qué algo está hecho así, preguntar.
9. **Los tests comprueban la intención**, no solo el comportamiento. Un test que no puede fallar si cambia la regla de negocio está mal.
10. **Resumen tras cada paso importante:** qué se hizo, qué está verificado y qué falta.
11. **Respetar las convenciones del código**, aunque no gusten. Si una parece dañina, decirlo; no bifurcar en silencio.
12. **Fallar en voz alta.** "Hecho" es falso si algo se omitió; "los tests pasan" es falso si alguno se saltó.

## Seguridad y datos

- **SQL:** los scripts generan SQL; aplicarlo a una base de datos real lo decide el usuario después de revisarlo. Cargar siempre con `docker cp` + `psql -f` (`scripts/apply_sql.ps1` en Windows, `scripts/rebuild_db_from_sql.sh` en Linux), nunca por tubería: la de PowerShell corrompe los acentos.
- **Cambios en la arquitectura, el diseño o el código existente** se acuerdan antes con el desarrollador principal.
- **Nada de basura en el repositorio.** Pruebas, volcados, capturas y scripts de un solo uso van al scratchpad de la sesión. Al terminar, `git status` solo muestra el trabajo pedido.
- **Sin credenciales** en archivos del repositorio (contraseñas, tokens, URLs con usuario y clave).
- **Tratamiento:** el usuario y el desarrollador principal son hombres. En masculino, nunca «la usuaria» (el log antiguo lo usa por error).

## Principios del proyecto

Se cargan siempre, con este archivo:

@docs/principios.md

## Mapa de documentos

| Documento | Qué es | Leer antes de… |
|---|---|---|
| `docs/principios.md` | Principios transversales | (se carga siempre con este archivo) |
| `docs/criterios-funcionales.md` | Qué hace la app y con qué reglas, por área | cambiar funcionalidad, datos, API o MCP |
| `docs/criterios-diseno.md` | Reglas vigentes de la interfaz | tocar el aspecto o la interacción del frontend |
| `docs/criterios-herramientas.md` | Instalación, base de datos, empaquetado | tocar Docker, migraciones, scripts o Tauri |
| `docs/analisis-arquitectura.md` | Análisis inicial (§1-6) y **log general** (§7, decisiones 1-73) | buscar por qué se decidió algo (por número de decisión) |
| `docs/decisiones-diseno.md` | **Log de diseño** (D1, D2…) | buscar por qué la interfaz es como es |
| `docs/decisiones-herramientas.md` | **Log de herramientas** (H1, H2…) | buscar por qué la instalación o la base funcionan así |
| `docs/plan-de-desarrollo.md` | Fases y su estado | planificar |
| `docs/portabilidad.md` | Instalación y biblioteca de datos por separado | tocar la biblioteca (SSD) |
| `docs/protocolo-ingesta-ia.md` | Ingesta de un formato nuevo con ayuda de IA | ingerir un formato nuevo |
| `docs/protocolo-sintesis-ia.md` | Formato del archivo de síntesis de literatura | tocar la síntesis de IA |
| `docs/instalador-linux-diseno.md` | Diseño del instalador para Linux (borrador) | trabajar en el instalador |
| `docs/rediseno-interfaz-diseno.md` | Diseño del rediseño de la interfaz (spec): temas, tokens, estructura y gráficos, con sus valores | tocar el aspecto de la interfaz |
| `docs/rediseno-interfaz-plan-fase1.md`, `docs/rediseno-interfaz-plan-fase2.md`, `docs/rediseno-interfaz-plan-fase3.md`, `docs/rediseno-interfaz-plan-3d.md`, `docs/rediseno-interfaz-plan-fase4.md` | Planes de implementación del rediseño, por fase | retomar o revisar una fase del rediseño |
| `backend/database/migrations/README.md` | Migraciones y reconstrucción de la base | aplicar migraciones o cargar datos |

`frontend/`, `backend/` y `scripts/` tienen su propio CLAUDE.md, que se carga al trabajar en esa carpeta, con las reglas y los comandos de verificación de cada parte.

## Dónde se escribe cada cosa

- **Criterios** (principios, funcionales, diseño, herramientas): solo lo vigente. Cada criterio es una regla de 1 a 3 líneas con la entrada del log de la que sale (N, Dn o Hn). Si un criterio cambia, se reescribe; no se acumula historia.
- **Logs**: una entrada corta por cambio, en el log de su tipo: funcional en la §7 de `docs/analisis-arquitectura.md` (la siguiente es la 77; la 74, la 75 y la 76 pasaron a D1, H1 y D2), diseño en `docs/decisiones-diseno.md` (D) y herramientas en `docs/decisiones-herramientas.md` (H). Cada entrada lleva fecha, qué, por qué y cómo se verificó, y va en el mismo commit que el cambio. No lleva conversación («X pidió…»), pasos intermedios, estados temporales, problemas de la sesión ni líneas que remitan a otro documento.
- **Si un cambio altera un criterio**, se actualizan el log y el documento de criterios.
- **Plantilla de entrada.** En el log general, como elemento numerado; en los logs D y H, con el encabezado `## D5. Título -- fecha`. Si una entrada no cabe en unas cinco líneas, sobra detalle.

```
77. Título corto -- 25/09/2026.

    **Qué.** Lo que cambia, en dos o tres frases.
    **Por qué.** El motivo y el criterio que aplica o que cambia.
    **Verificación.** Cómo se comprobó: pruebas, recuentos, navegador.
```

- **Tras tocar la documentación**, `python scripts/check_docs.py` (`python3` en Linux) debe dar OK. Comprueba que las fuentes citadas y las rutas existen, que no hay redirecciones ni «la usuaria» y que el mapa está completo.
- **El trabajo en curso** (lo pendiente, las decisiones abiertas) va en el plan o en la memoria de la sesión, no en los criterios ni en el log.
- **Los comentarios del código** citan la entrada del log: «decisión N», «D4», «H1».

## Entorno

- `docker compose up -d`: Postgres con pgvector (`neurograph-postgres`) y la API (`neurograph-api`, `http://127.0.0.1:8420`). El frontend se arranca con `npm run dev` en `frontend/` (`http://localhost:5173`).
- Base de datos vacía: cargar un volcado o la carga inicial de `init/`. En Windows, archivo a archivo con `scripts/apply_sql.ps1`, en el orden de `backend/database/migrations/README.md`; en Linux, todo de una vez con `scripts/rebuild_db_from_sql.sh`. La tractografía no está en esa carga inicial: la instala `scripts/install_tractography.sh` (solo Linux).
- Entorno virtual de Python en la raíz: `pip install -e ".[dev]"`. Los comandos de verificación de cada parte están en su CLAUDE.md.
