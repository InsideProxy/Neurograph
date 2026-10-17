# shellcheck shell=bash disable=SC2034  # las variables las usan otros archivos
# Cifras esperadas y umbrales del instalador Linux (H10). Un solo sitio:
# si el desarrollador principal anade datos a init/ o herramientas al MCP,
# se actualizan aqui y en las pruebas.

NG_ESPERADO_REGIONES=1172
NG_ESPERADO_CONEXIONES=104115

# Ultima migracion (backend/database/migrations/versions): la que debe tener un
# volumen de origen desconocido para adoptarlo (bloque A).
NG_ESPERADO_ESQUEMA=0015

# Sin huerfanas (las mismas comprobaciones que rebuild_db_from_sql.sh): se
# exigen tambien con un volumen conservado de otra version (B1).
NG_ESPERADO_HUERFANAS=(
  "select count(*) from coordinates c where not exists (select 1 from regions r where r.id = c.entity_id)|0"
  "select count(*) from connections c where not exists (select 1 from regions r where r.id = c.target_id) or not exists (select 1 from regions r where r.id = c.source_id union all select 1 from tracts t where t.id = c.source_id)|0"
  "select count(*) from homologies h where not exists (select 1 from regions where id = h.source_id) or not exists (select 1 from regions where id = h.target_id)|0"
)

# Carga inicial (verificacion de la H1): consulta|valor.
NG_ESPERADO_CARGA=(
  "select count(*) from species|3"
  "select count(*) from atlases|8"
  "select count(*) from regions|$NG_ESPERADO_REGIONES"
  "select count(*) from coordinates|1172"
  "select count(*) from networks|65"
  "select count(*) from region_network_memberships|1744"
  "select count(*) from connections|$NG_ESPERADO_CONEXIONES"
  "select count(*) from tracts|52"
  "select count(*) from homologies|60"
  "select count(*) from studies|10"
  "select count(*) from datasets|8"
  "select count(*) from regions where abbreviation is null|0"
  "select count(*) from atlases where study_id is null|0"
  "${NG_ESPERADO_HUERFANAS[@]}"
)

# Tractografia (decisiones 49 y 66, ESPERADO_BASE del script): tractos ORG,
# nodos y aristas.
NG_ESPERADO_TRACTOGRAFIA="41 176 5176"
NG_CONSULTA_TRACTOGRAFIA="select (select count(*) from tracts where id like 'tract.human.org2018.%') || ' ' || (select count(*) from tractography_nodes) || ' ' || (select count(*) from tractography_edges)"

# Herramientas del MCP (backend/mcp/server.py).
NG_ESPERADO_HERRAMIENTAS_MCP=12

# Imagenes base que descarga el instalador con docker pull (B7: al
# desinstalar solo se quitan las que descargo el). Las de FROM de los
# Dockerfile (node, python, nginx, docker:cli) no estan: con BuildKit no
# quedan en «docker image ls» (comprobado), asi que se
# anotarian sin poder quitarse; quedan en la cache de construccion, que el
# desinstalador cuenta aparte.
NG_IMAGENES_BASE=(pgvector/pgvector:pg16)

# Umbrales de recursos, en MB (de 1024 x 1024 bytes, como df -m). Medidos
# el 03/10/2026 en una instalacion completa desde cero (B8.5:
# integracion.sh completa), con el margen que dice cada uno. Son topes
# de ingenieria, no umbrales cientificos (principio 8), y siempre se avisa
# cuando actuan.
# Memoria libre para la base: el maximo entre los tres contenedores
# encendidos (448 MB con docker stats) y el RUN mas pesado del paso 5
# (947 MB, el pip install de la API; la web, 505 MB con npm ci), mas 1000 MB
# para el sistema: 1947, redondeado a 2000.
NG_MIN_MEMORIA_BASE_MB=2000
# Tope de memoria del contenedor de la tractografia: pico medido (2075 MB,
# memory.peak del cgroup) x 1,5 = 3113 MB, redondeado hacia arriba a GB.
# La memoria libre que se pide para lanzarla es ese mismo tope.
NG_TOPE_MEMORIA_TRACTO=4g
NG_MIN_MEMORIA_TRACTO_MB=4096
# Espacio de Docker para la instalacion completa: lo que crecio su carpeta
# (2233 MB con df) mas la imagen de Postgres, que este equipo ya tenia
# (418 MB), x 1,3 = 3446, redondeado a 3500.
NG_MIN_ESPACIO_DOCKER_MB=3500
# Espacio de Docker temporal de la tractografia, ademas del anterior: la
# capa maxima de su contenedor (1040 MB, el entorno de Python), el SQL que
# se copia al /tmp de Postgres a la vez (117 MB) y sus tablas (106 MB), x 1,3
# = 1642, redondeado a 1650.
NG_MIN_ESPACIO_DOCKER_TRACTO_MB=1650
# Biblioteca: lo medido (628 MB) x 1,3 = 817 MB, pero
# scripts/install_tractography.sh exige 1000 MB libres antes de empezar: si
# el umbral fuera menor, el paso 8 lanzaria una tractografia que el script
# rechaza.
NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB=1000

# Tiempos maximos de espera, en segundos.
NG_ESPERA_POSTGRES=120
NG_ESPERA_API=120
NG_ESPERA_WEB=60
NG_ESPERA_MCP=60
