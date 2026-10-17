# Pruebas de esperado.ps1 (H11).
. "$env:NG_LIB\esperado.ps1"

function prueba_cada_recuento_es_consulta_y_cifra {
  igual 16 $NG_ESPERADO_CARGA.Count 'trece recuentos y las tres huérfanas'
  foreach ($l in $NG_ESPERADO_CARGA) {
    $i = $l.LastIndexOf('|')
    if ($i -lt 1 -or $l.Substring($i + 1) -notmatch '^\d+$') { throw "FALLA: «$l» no es consulta|cifra" }
  }
}

function prueba_umbrales_y_tiempos_son_numeros {
  foreach ($v in 'NG_MIN_MEMORIA_BASE_MB', 'NG_MIN_MEMORIA_DOCKER_DESKTOP_MB', 'NG_MIN_MEMORIA_TRACTO_MB', 'NG_MIN_ESPACIO_DOCKER_MB',
    'NG_MIN_ESPACIO_DOCKER_TRACTO_MB', 'NG_ESPACIO_DOCKER_DESKTOP_MB', 'NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB', 'NG_ESPERA_DOCKER_DESKTOP') {
    $x = Get-Variable -Name $v -ValueOnly
    if (-not ($x -is [int]) -or $x -le 0) { throw "FALLA: $v no es un número positivo ($x)" }
  }
}
