// Tope de seguridad para dibujar conexiones (01/09/2026, corrige un
// crasheo real reportado por la usuaria: "se seleccionan en gris todas
// las conexiones del connectograma, y crushea").
//
// Diagnóstico verificado antes de tocar nada (nunca por suposición):
// se descargó y midió el propio `averageConnectivity_Fpt.csv` de Rosen &
// Halgren 2021 (el conectoma real aplicado ayer, decisión 41). Tras la
// transformación inversa ya documentada (`peso = 10 ** log10_Fpt`), el
// peso máximo real de las 64620 conexiones es 0.144 -- por debajo del
// "peso mínimo" por defecto (0.3, calibrado en su día contra la escala
// de Brainnetome, una fuente distinta). Es decir: con el umbral por
// defecto, ESTE conectoma es invisible (0 de 64620 conexiones pasan el
// filtro) -- un resultado real, no un error, pero que empuja con razón a
// bajar el umbral para poder ver algo. Al bajarlo lo suficiente, las
// tres visualizaciones (Connectogram.tsx, Hemisferios.tsx) intentaban
// dibujar hasta las 64620 conexiones a la vez -- un elemento SVG con su
// propio manejador de clic por cada una -- lo que satura el motor de
// renderizado y crashea la ventana, sobre todo dentro del WebView de
// Tauri.
//
// Este tope es una decisión de INGENIERÍA (cuántos elementos puede
// dibujar el navegador sin congelarse), completamente distinta de
// `minWeight` (una decisión CIENTÍFICA sobre qué conectividad es lo
// bastante fuerte para mostrarse) -- nunca se usa para filtrar datos ni
// se guarda como si fuera un umbral de la sección 24. Cuando se supera,
// no se dibuja NINGUNA conexión (nunca un subconjunto arbitrario
// truncado, que daría una imagen falsamente completa) -- se avisa con un
// mensaje explícito para que la usuaria suba el peso mínimo o ausente
// más redes desde el panel de Filtros.
//
// Subido de 2500 a 10000 el 07/09/2026 (decisión 60 de
// docs/analisis-arquitectura.md): con el conectoma real completo ya
// cargado en el ejecutable empaquetado (104115 conexiones reales, muy
// por encima de las 64620 del conectoma de Rosen & Halgren contra el que
// se calibró originalmente el tope de 2500), la propia usuaria reportó
// que la selección normal de puntos en el conectograma dejaba de
// dibujar líneas -- el tope se disparaba con selecciones razonables, no
// solo con casos extremos. Sigue siendo una cota de ingeniería sin medir
// contra el hardware real de la usuaria (no se puede probar el
// rendimiento real desde este entorno) -- si 10000 tampoco aguanta sin
// congelarse, se baja aquí, en un único sitio, hasta encontrar el techo
// real de su equipo.
export const MAX_RENDERED_CONNECTIONS = 10000;
