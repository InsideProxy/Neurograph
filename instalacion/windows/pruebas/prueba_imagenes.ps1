# Pruebas de imagenes.ps1 (paso 5, H11).
$DOCKER_IMAGENES = @('image inspect pgvector|1||', 'image inspect neurograph-app-api|1||', 'image inspect|0||', 'context show|0||desktop-linux', 'pull|0||', 'build|0||')

function prueba_construye_las_tres_con_el_constructor_del_contexto {
  simular_tabla docker $DOCKER_IMAGENES
  igual 0 (con_lib "`$script:NG_RAIZ = 'C:\proyecto'; paso_imagenes; decir (`"nuevas=`" + (`$script:NG_IMAGENES_NUEVAS -join ','))" docker, imagenes) 'sale con 0'
  $l = llamadas docker
  contiene 'pull pgvector/pgvector:pg16' $l 'descarga la base de datos que falta'
  contiene 'build --builder desktop-linux --progress plain -t neurograph-app-api -f C:\proyecto\backend\Dockerfile C:\proyecto' $l 'la API'
  contiene '-t neurograph-app-web -f C:\proyecto\instalacion\docker\web.Dockerfile' $l 'la web'
  contiene '-t neurograph-app-herramientas -f C:\proyecto\instalacion\docker\herramientas.Dockerfile --build-arg IMAGEN_API=neurograph-app-api' $l 'las herramientas, sobre la API'
  contiene 'nuevas=neurograph-app-api' (pantalla) 'solo la que no estaba se anota para la limpieza'
  igual 'pgvector/pgvector:pg16' (valor_estado NG_IMAGENES_DESCARGADAS) 'la base descargada, anotada'
}

function prueba_las_descargadas_no_se_repiten {
  estado_con "NG_IMAGENES_DESCARGADAS=pgvector/pgvector:pg16`n"
  [void](con_lib "anotar_imagenes_descargadas @('pgvector/pgvector:pg16', 'otra:1')" docker, imagenes)
  igual 'pgvector/pgvector:pg16 otra:1' (valor_estado NG_IMAGENES_DESCARGADAS) 'sin repetir'
}

function prueba_un_fallo_de_construccion_da_su_frase {
  simular_tabla docker (@('build --builder desktop-linux --progress plain -t neurograph-app-web|1||#9 ERROR: failed to solve') + $DOCKER_IMAGENES)
  igual 1 (con_lib "`$script:NG_RAIZ = 'C:\proyecto'; paso_imagenes" docker, imagenes) 'sale con 1'
  contiene 'Falló la preparación de la web.' (pantalla) 'dice qué'
  simular_tabla docker (@('build --builder desktop-linux --progress plain -t neurograph-app-api|1||write /var/lib/docker/x: no space left on device') + $DOCKER_IMAGENES)
  [void](con_lib "`$script:NG_RAIZ = 'C:\proyecto'; paso_imagenes" docker, imagenes)
  contiene 'No hay espacio suficiente para Docker.' (pantalla) 'sin espacio, la frase de espacio'
}
