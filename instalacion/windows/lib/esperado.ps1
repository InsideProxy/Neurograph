# Cifras esperadas, umbrales y tiempos del instalador Windows (H11).
#
# Las cifras (recuentos, consultas, esquema, tractografia y herramientas del
# MCP) son una copia de instalacion/linux/lib/esperado.sh: el comando diario
# de cada instalador funciona sin la carpeta del proyecto. Formato sencillo,
# una cifra o una consulta por linea y entre comillas simples (en ellas, ''
# es una comilla): instalacion/linux/pruebas/prueba_esperado_windows.sh las
# lee con sed y comprueba que las dos copias coinciden. Si el desarrollador
# principal anade datos a init/ o herramientas al MCP, se cambian en las dos.

$NG_ESPERADO_REGIONES = '1172'
$NG_ESPERADO_CONEXIONES = '104115'

# Ultima migracion: la que debe tener un volumen de origen desconocido para adoptarlo.
$NG_ESPERADO_ESQUEMA = '0015'

# Sin huerfanas (las comprobaciones de rebuild_db_from_sql.sh), tambien con
# un volumen conservado de otra version.
$NG_ESPERADO_HUERFANAS = @(
  'select count(*) from coordinates c where not exists (select 1 from regions r where r.id = c.entity_id)|0'
  'select count(*) from connections c where not exists (select 1 from regions r where r.id = c.target_id) or not exists (select 1 from regions r where r.id = c.source_id union all select 1 from tracts t where t.id = c.source_id)|0'
  'select count(*) from homologies h where not exists (select 1 from regions where id = h.source_id) or not exists (select 1 from regions where id = h.target_id)|0'
)

# Carga inicial (verificacion de la H1): consulta|valor.
$NG_ESPERADO_CARGA = @(
  'select count(*) from species|3'
  'select count(*) from atlases|8'
  'select count(*) from regions|1172'
  'select count(*) from coordinates|1172'
  'select count(*) from networks|65'
  'select count(*) from region_network_memberships|1744'
  'select count(*) from connections|104115'
  'select count(*) from tracts|52'
  'select count(*) from homologies|60'
  'select count(*) from studies|10'
  'select count(*) from datasets|8'
  'select count(*) from regions where abbreviation is null|0'
  'select count(*) from atlases where study_id is null|0'
) + $NG_ESPERADO_HUERFANAS

# Tractografia (decisiones 49 y 66): tractos ORG, nodos y aristas.
$NG_ESPERADO_TRACTOGRAFIA = '41 176 5176'
$NG_CONSULTA_TRACTOGRAFIA = 'select (select count(*) from tracts where id like ''tract.human.org2018.%'') || '' '' || (select count(*) from tractography_nodes) || '' '' || (select count(*) from tractography_edges)'

# Herramientas del MCP (backend/mcp/server.py).
$NG_ESPERADO_HERRAMIENTAS_MCP = '12'

# Imagenes base que descarga el instalador con docker pull (B7: al
# desinstalar solo se quitan las que descargo el). Una por linea, como las
# consultas: la prueba de Linux tambien las compara.
$NG_IMAGENES_BASE = @(
  'pgvector/pgvector:pg16'
)

# --- Lo de Windows: requisitos de Docker Desktop (datos verificados del diseno).
$NG_BUILD_MINIMA_10 = 19045     # Windows 10 22H2
$NG_BUILD_PRIMERA_11 = 22000    # la primera de Windows 11
$NG_BUILD_MINIMA_11 = 22631     # Windows 11 23H2
$NG_WSL_MINIMA = '2.1.5'
$NG_MIN_RAM_INSTALADA_MB = 8192
$NG_URL_DOCKER_DESKTOP = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe'
$NG_URL_LICENCIA_DOCKER = 'https://www.docker.com/legal/docker-subscription-service-agreement/'
$NG_URL_WSLCONFIG = 'https://learn.microsoft.com/windows/wsl/wsl-config'

# Umbrales, en MB de 1024 x 1024 bytes. Son topes de ingenieria, no umbrales
# cientificos (principio 8), y siempre se avisa cuando actuan. Los de
# Windows se miden en Windows: PROVISIONAL marca los que aun copian el de
# Linux o una estimacion, hasta medirlos.
# Memoria libre para la base: el umbral de Linux (contenedores encendidos y
# el RUN mas pesado del paso 5, mas el sistema).
$NG_MIN_MEMORIA_BASE_MB = 2000
# Memoria que toma Docker Desktop encendido y en reposo, si aun no lo esta. PROVISIONAL.
$NG_MIN_MEMORIA_DOCKER_DESKTOP_MB = 1500
# Tope de memoria del contenedor de la tractografia y memoria libre que se
# pide para lanzarla dentro de Docker (B2). Medido el 10/10/2026 en la
# maquina virtual de pruebas, con 12 GB (memory.peak del cgroup, leido
# cada 2-3 s): pico de 1940 MB; en Linux, con el mismo
# contenedor, 2075 MB (H10). El mayor x 1,5 = 3113 MB, redondeado hacia
# arriba a GB: los de Linux. Dentro de Docker habia 4943 MB libres y bajaron
# hasta 3245. En Windows se pide lo que aun puede tomar la maquina virtual de
# WSL, como mucho esto, mas lo que gasta Windows (memoria_windows_para_tracto,
# en sistema.ps1).
$NG_TOPE_MEMORIA_TRACTO = '4g'
$NG_MIN_MEMORIA_TRACTO_MB = 4096
# Lo que Linux no deja ver de la memoria de WSL: MemTotal queda 215 MB por
# debajo de lo configurado (5919 MB de 6134, la mitad de 12 268; datos
# verificados del diseno), redondeado hacia arriba.
$NG_MEMORIA_OCULTA_WSL_MB = 256
# La que gasta el propio Windows mientras corre la tractografia, ademas de lo
# que tome la maquina virtual de WSL. Medido el 10/10/2026 en la maquina
# virtual de pruebas: al
# descargar a la biblioteca, la disponible de Windows bajo 750 MB durante unos
# 20 s sin que creciera vmmemWSL (de 2914 a 2164 MB; en la primera medicion,
# 106). x 1,5 = 1125, redondeado a 1200.
$NG_MEMORIA_WINDOWS_TRACTO_MB = 1200
# La que usa Windows, sin la maquina virtual de WSL, con NeuroGraph
# encendido: la frase de la memoria de Docker no propone darle a WSL tanta
# que no quede esta. Medida el 10/10/2026 en la maquina virtual de
# pruebas antes de la
# tractografia: 12 268 MB visibles menos 5926 de vmmemWSL y 2866 disponibles
# = 3476 MB; x 1,5 = 5214, redondeado a 5300.
$NG_MEMORIA_WINDOWS_MB = 5300
# Espacio para la instalacion, medido el 10/10/2026 en la maquina virtual
# de pruebas (datos
# verificados del diseno): la instalacion sin la tractografia, con Docker
# Desktop y WSL por instalar, gasto 11 474 MB de C:, de ellos 6,1 GB el disco
# virtual de Docker (imagenes, base y cache de construccion). x 1,3, como en
# Linux, redondeado hacia arriba.
# Lo que crece el disco virtual de Docker con NeuroGraph: 6100 x 1,3 = 7930.
$NG_MIN_ESPACIO_DOCKER_MB = 8000
# Espacio temporal de la tractografia dentro de Docker, ademas del anterior:
# el de Linux. La instalacion completa con la tractografia gasto 13 185 MB
# de C:, 1711 mas que sin ella, biblioteca de 630 MB incluida: el resto
# (1081 x 1,3 = 1405) cabe en estos 1650.
$NG_MIN_ESPACIO_DOCKER_TRACTO_MB = 1650
# Docker Desktop, WSL y lo demas que no es el disco virtual, si faltan:
# 11 474 - 6100 = 5374 x 1,3 = 6986.
$NG_ESPACIO_DOCKER_DESKTOP_MB = 7000
# Biblioteca: scripts/install_tractography.sh exige 1000 MB libres antes de empezar.
$NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB = 1000
# Lo que ocupa la biblioteca con la tractografia (628 MB medidos en Linux,
# H10), para decirlo al proponer una nueva (B2).
$NG_TAMANO_BIBLIOTECA_MB = 630

# Tiempos maximos, en segundos.
$NG_ESPERA_POSTGRES = 120
$NG_ESPERA_API = 120
$NG_ESPERA_WEB = 60
$NG_ESPERA_MCP = 60
$NG_ESPERA_DOCKER_DESKTOP = 300   # PROVISIONAL: su primer arranque
$NG_ESPERA_DESCARGA = 3600
$NG_ESPERA_INSTALADOR_DOCKER = 1800
$NG_ESPERA_WSL = 1200
# Cada orden de Docker de la limpieza (B1): con Docker colgado, la ventana no se queda esperando.
$NG_ESPERA_LIMPIEZA = 60
