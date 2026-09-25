# NeuroGraph — Principios

Reglas transversales que se aplican a todo el proyecto: datos, ingesta, API, MCP e interfaz. Solo recoge lo vigente. Entre paréntesis va la entrada del log de la que sale cada regla: un número es una decisión de la §7 de `docs/analisis-arquitectura.md` («§4.1» y «riesgo 7» son secciones de ese mismo documento); D y H son entradas de `docs/decisiones-diseno.md` y `docs/decisiones-herramientas.md`. «Sección 24» y similares remiten a la especificación maestra.

## Papel de la IA

1. **La IA interpreta y planifica; nunca es el motor científico.** Todo cálculo científico vive en el motor Python y en los datos. La IA nunca inventa conexiones, homologías ni evidencia. (§1, 71)
2. **Una síntesis de IA nunca pasa sola a dato permanente.** Hace falta una decisión nueva y documentada; no existe un botón de «guardar en la base». Un desacuerdo real entre fuentes se presenta como tal, no como consenso. (40, 71)

## Honestidad de los datos (sección 24)

3. **No se inventa nada.** Un dato que la fuente no aporta queda NULL y la API lo devuelve como tal. Nunca se deduce de otro campo (el hemisferio no sale del signo de x ni la abreviatura del nombre) ni se rellena con un valor plausible. (12, 15, 29, 51)
4. **Observado, inferido e hipótesis se distinguen siempre.** Todo dato derivado lleva `method` y `confidence` obligatorios. Ninguna función ni ningún texto «redondea» una similitud a homología confirmada, y lo confirmado y lo hipotético nunca se fusionan visualmente. (riesgo 4, 5, 40)
5. **Los datos reales y los de demostración nunca se mezclan.** Lo sintético se etiqueta siempre y nunca tiene apariencia de real: no lleva malla anatómica ni consulta tractos. (4, 14, 38)
6. **Sin umbrales arbitrarios.** Se carga el dato completo, incluidos los ceros, y la interfaz decide qué mostrar. Los filtros por defecto no descartan nada. Si existe un recurso binario publicado (una máscara, una etiqueta), se usa en lugar de un umbral propio. (5, 9, 22, 61)
7. **Una condición estructural de la pregunta no es un umbral.** Ejemplos: un tracto debe tocar al menos dos regiones de la selección para informar de la conectividad entre ellas; una streamline con los dos extremos en la misma etiqueta es un bucle. (13, 66)
8. **Un tope de ingeniería no es un umbral científico y nunca oculta datos en silencio.** Por encima del tope no se dibuja nada y se avisa, o bien se guardan juntos el recuento real y el mostrado. El umbral de dibujo nunca se reutiliza en un cálculo. (8, 42, 49, 61)
9. **Nada se oculta ni se descarta en silencio.** Lo que no se puede clasificar se muestra en gris y lo que se excluye se cuenta y se avisa. «No existe» (HTTP 404), «existe pero está vacío» y «se buscó y no hay nada» son respuestas distintas. (8, 14, 15, 35, 66)
10. **Todo o nada.** Una entrada con forma inesperada lanza un error que explica qué falta o qué es válido. Nunca se adivina por parecido ni se importa o pinta a medias como si fuera un éxito. (41, 44, 71, 72, 73)
11. **No se deriva lo que el estudio no observó.** Cada fuente se carga con su granularidad original: por ejemplo, no se infieren conexiones región-región de que dos regiones compartan un tracto. (9)
12. **Toda transformación es determinista y está documentada.** Los muestreos usan una semilla fija, nunca «las primeras N» ni azar sin semilla, y las conversiones usan la inversa exacta publicada. (41, 49, 66)

## Procedencia

13. **Todo se comprueba contra la fuente primaria**: el archivo real, su documentación oficial, Crossref o la web del editor, NCBI Taxonomy o el md5 publicado. Nunca de memoria ni de un resumen de terceros. Si una tabla secundaria y el archivo de datos no coinciden, manda el archivo. (22, 26, 28, 51, 63)
14. **Nunca se fabrica una cita.** Autores, revista y resumen se copian literales de la fuente, y se cita al estudio que realmente define el dato. (6, 20, 40, 50)
15. **Los datos originales no se modifican.** Toda transformación genera un derivado con su procedencia (`dataset.yaml`, checksum, licencia, origen). Si un dato es una síntesis sobre varias citas, su `source_dataset_id` queda NULL: nunca se crea un dataset que finja una procedencia. (§4.5, 22, 40)
16. **La conectividad estructural, la funcional y la efectiva nunca se mezclan**, y cada conexión conserva su nivel de evidencia. (sección 8, 14)

## Espacios de referencia

17. **Toda coordenada y toda geometría declaran su espacio de referencia**, verificado numéricamente (affine y forma) o contra la publicación, nunca deducido del nombre. (22, 25, 63)
18. **Nunca se mezclan ni se superponen espacios sin un registro verificado.** Cada especie y cada atlas en espacio propio (por ejemplo, la tractografía ORG) va en su propia vista. Si no hay una malla verificada del mismo espacio, no se dibuja fondo. (22, 49, 65, 66)

## Base de datos y reproducibilidad

19. **El SQL lo genera el código del proyecto y nunca se aplica a la base real sin revisión humana.** Ningún script, herramienta MCP, IA ni botón sustituye esa revisión. (17, 41, 46)
20. **Reproducible:** SQL idempotente (`ON CONFLICT DO UPDATE`), esquema solo por migraciones y nunca tablas editadas a mano. (sección 23, 26)
21. **Se verifica el contenido real, no el mensaje de éxito.** Un artefacto (SQL, volcado, carga) se comprueba con recuentos. El estado de la base se consulta; no se da por bueno lo que diga la documentación. (51, 53, 59)

## Método

22. **Las decisiones metodológicas abiertas las toma el usuario.** Se le presentan las alternativas con su coste real. (45, 50, 54)
23. **Esquema, dependencias y herramientas se añaden cuando un dato real los necesita, no antes.** No se crean funciones ni fases sin datos detrás. (27, 31, 47, 52)
24. **Es un instrumento de investigación, no de ilustración.** Ningún cambio de presentación altera la geometría real ni la semántica visual de los datos (el color de la red, el grosor del peso, el trazo de la evidencia). Todo objeto visual se puede rastrear hasta su ID científico. (§4.1, 18, 24, D1)
