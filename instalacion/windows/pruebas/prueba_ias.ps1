# Pruebas de ias.ps1 (B5 del diseno, H11).
$LIBS = @('sistema', 'docker', 'ias')
$CONECTAR = 'conectar_ias; decir "IAS=$($script:NG_IAS_RESUMEN)"'
# Una IA como las de npm: un .cmd (con un .ps1 al lado, que no se usa) que
# anota sus argumentos y la carpeta desde la que la lanzan.
function ia_npm([string]$ia, [string]$extra = '') {
  escribir_ps1 (Join-Path $env:NG_PRUEBA_BIN "$ia.ps1") "throw 'se usó el .ps1'"
  simular $ia (">>`"$env:NG_PRUEBA_LLAMADAS\$ia`" echo(%*`r`n>>`"$env:NG_PRUEBA_LLAMADAS\$ia.carpeta`" echo(%CD%`r`n" + $extra)
}
function sin([string]$ias) { return @{ NEUROGRAPH_PRUEBA_SIN_PROGRAMAS = $ias } }

function prueba_sin_ias_no_se_pregunta {
  simular_tabla docker @('*|1||')
  [void](con_lib $CONECTAR $LIBS -Entorno (sin 'claude codex gemini'))
  contiene 'IAS=no se encontró ninguna IA de terminal' (pantalla) 'lo dice'
  no_contiene 'Conectar NeuroGraph' (registro) 'sin preguntar'
}

function prueba_si_dice_que_no_no_registra {
  ia_npm claude
  simular_tabla docker @('*|1||')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'codex gemini') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 'n' }))
  contiene 'IAS=sin conectar (para hacerlo después: neurograph conectar-ia)' (pantalla) 'lo dice'
  igual '' (llamadas claude) 'no toca la IA'
}

function prueba_registra_claude_con_cmd_c_desde_el_perfil {
  ia_npm claude
  simular_tabla docker @('inspect|0||false')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'codex gemini') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }))
  $l = llamadas claude
  contiene 'mcp remove neurograph -s user' $l 'quita antes el registro anterior'
  contiene "mcp add --transport stdio --scope user neurograph -- cmd.exe /c $env:LOCALAPPDATA\neurograph-app\bin\neurograph-mcp.cmd" $l 'lo añade con cmd.exe /c'
  igual $env:USERPROFILE ((llamadas 'claude.carpeta') -split "`r?`n")[0].Trim() 'desde el perfil, no desde la carpeta del proyecto'
  contiene 'IAS=Claude Code: registrado · Codex CLI: no encontrado · Gemini CLI: no encontrado' (pantalla) 'el resumen'
  igual claude (valor_estado NG_IAS_REGISTRADAS) 'se anota'
}

function prueba_registra_codex_y_gemini_con_sus_ordenes {
  ia_npm codex
  ia_npm gemini
  simular_tabla docker @('inspect|0||false')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'claude') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }))
  $mcp = "$env:LOCALAPPDATA\neurograph-app\bin\neurograph-mcp.cmd"
  $c = @((llamadas codex) -split "`r?`n" | Where-Object { $_ })
  igual 'mcp remove neurograph' $c[0] 'Codex: quita antes el registro anterior'
  igual "mcp add neurograph -- cmd.exe /c $mcp" $c[1] 'Codex: lo añade con cmd.exe /c'
  $g = @((llamadas gemini) -split "`r?`n" | Where-Object { $_ })
  igual 'mcp remove --scope user neurograph' $g[0] 'Gemini: quita antes el registro anterior'
  igual "mcp add --scope user neurograph cmd.exe /c $mcp" $g[1] 'Gemini: lo añade con cmd.exe /c, para el usuario'
  igual $env:USERPROFILE ((llamadas 'gemini.carpeta') -split "`r?`n")[0].Trim() 'desde el perfil'
  contiene 'Codex CLI: registrado · Gemini CLI: registrado' (pantalla) 'el resumen'
  igual 'codex gemini' (valor_estado NG_IAS_REGISTRADAS) 'se anotan las dos'
}

function prueba_una_ruta_con_espacio_y_tilde_llega_entera {
  eco_en_bin claude  # escribe cada argumento entre corchetes: se ve dónde empieza y acaba
  [void](con_lib "`$script:NG_BIN = 'C:\Users\Iñaki López\AppData\Local\neurograph-app\bin'; [void](registrar_ia claude)" $LIBS)
  contiene '[C:\Users\Iñaki López\AppData\Local\neurograph-app\bin\neurograph-mcp.cmd]' (registro) 'un solo argumento, entero'
}

function prueba_una_ia_que_falla_no_para_a_las_demas {
  ia_npm claude
  ia_npm gemini 'exit /b 1'
  simular_tabla docker @('inspect|0||false')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'codex') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }))
  contiene 'Claude Code: registrado' (pantalla) 'la que funciona'
  contiene 'Gemini CLI: no se pudo registrar' (pantalla) 'la que falla, con su motivo'
  igual claude (valor_estado NG_IAS_REGISTRADAS) 'solo se anota la registrada'
}

function prueba_con_neurograph_encendido_se_comprueba_de_verdad {
  simular_tabla claude @('mcp list|0||neurograph: cmd.exe /c x - ✓ Connected', '*|0||')
  simular_tabla gemini @('mcp list|0||✗ neurograph: cmd.exe /c x (stdio) - Disconnected', '*|0||')
  simular_tabla docker @('inspect|0||true')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'codex') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }))
  contiene 'Claude Code: conectado' (pantalla) 'conectada'
  contiene 'Gemini CLI: no responde' (pantalla) 'desconectada'
  contiene 'Gemini CLI no responde a NeuroGraph' ([IO.File]::ReadAllText((Join-Path $env:LOCALAPPDATA 'neurograph-app\.avisos'))) 'con su aviso'
}

# La lista de mcp list puede salir por la salida de errores: se leen las dos,
# como «2>&1» en Linux.
function prueba_la_comprobacion_lee_tambien_la_salida_de_errores {
  simular_tabla claude @('mcp list|0||stderr:neurograph: cmd.exe /c x - ✓ Connected', '*|0||')
  simular_tabla gemini @('mcp list|0||stderr:✓ neurograph: cmd.exe /c x (stdio) - Connected', '*|0||')
  simular_tabla docker @('inspect|0||true')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'codex') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }))
  contiene 'Claude Code: conectado' (pantalla) 'Claude Code, por la salida de errores'
  contiene 'Gemini CLI: conectado' (pantalla) 'Gemini CLI, por la salida de errores'
}

function prueba_las_registradas_antes_se_conservan_y_quitar_solo_quita {
  estado_con "NG_IAS_REGISTRADAS=gemini`n"
  ia_npm claude
  simular_tabla docker @('inspect|0||false')
  [void](con_lib $CONECTAR $LIBS -Entorno ((sin 'codex gemini') + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }))
  igual 'claude gemini' (valor_estado NG_IAS_REGISTRADAS) 'la de antes sigue anotada'
  [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'claude'), '')
  [void](con_lib 'quitar_ia claude' $LIBS)
  igual 'mcp remove neurograph -s user' (llamadas claude).Trim() 'solo quita'
}

function prueba_claude_del_instalador_nativo_fuera_del_path {
  $d = Join-Path $env:USERPROFILE '.local\bin'
  [void](New-Item -ItemType Directory -Force -Path $d)
  Copy-Item -LiteralPath (Join-Path $env:NG_PRUEBA_HERRAMIENTAS 'falso.exe') -Destination (Join-Path $d 'claude.exe')
  [void](con_lib 'decir "IA=$(ia_ejecutable claude)"' $LIBS)
  contiene "IA=$d\claude.exe" (pantalla) 'lo encuentra'
}
