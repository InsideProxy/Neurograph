# Funciones comunes del instalador Windows (H11): constantes, la clase C#
# que lanza programas y escribe el registro, ejecutar_programa, pantalla,
# pasos, preguntas, fallar, bloqueo, Ctrl+C y ejecutar_principal. Lo que ve
# la persona va con decir (Write-Host escribe con la API Unicode de la
# consola); la salida tecnica, solo al registro (B1 del diseno). Los nombres
# son los de instalacion/linux/lib/comun.sh.
# Variables de prueba (sin efecto si no se definen):
#   NEUROGRAPH_PRUEBA_PROYECTO        otro nombre de proyecto de Docker
#   NEUROGRAPH_PRUEBA_RESPUESTA       respuesta a las preguntas (y al BORRAR del desinstalador)
#   NEUROGRAPH_PRUEBA_LATIDO_S        segundos entre los puntos del latido (20)
#   NEUROGRAPH_PRUEBA_CTRL_C          archivo: si existe, cuenta como un Ctrl+C (y se borra)
#   NEUROGRAPH_PRUEBA_HKCU            raiz del registro de Windows del usuario (HKCU:\)
#   NEUROGRAPH_PRUEBA_SOLO_SIMULADOS  carpeta de la prueba: no se lanza ningun programa de fuera de ella

. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'catalogo.ps1')
. (Join-Path $PSScriptRoot 'esperado.ps1')

# Con la salida redirigida (las pruebas, el arnes, una tuberia), en UTF-8:
# con la pagina OEM (850) de por defecto, quien la lea como UTF-8 perderia
# las tildes y los signos. En la consola no se toca: Write-Host usa la API
# Unicode y la consola clasica de Windows 10 muestra la 850. El cambio es de
# la consola, que comparten el cmd de instalar.cmd y lo que venga despues:
# al_salir la deja como estaba.
$NG_SALIDA_ORIGINAL = $null
if ([Console]::IsOutputRedirected) {
  try {
    $NG_SALIDA_ORIGINAL = [Console]::OutputEncoding
    [Console]::OutputEncoding = $NG_UTF8
  } catch { }
}

# C# 5 (el csc de .NET Framework que usa Add-Type).
$NG_CODIGO_CS = @'
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace NeuroGraph
{
    // Registro de la ejecucion (B1). Lo escriben a la vez PowerShell y los
    // hilos que leen la salida de los programas: va con un cerrojo. Se
    // comparte para lectura: el arnes de pruebas lo lee mientras se escribe.
    // Nunca relanza: una excepcion en un hilo de lectura (un disco lleno)
    // tumbaria powershell.exe. Cuenta las escrituras fallidas y avisa una vez.
    public static class Registro
    {
        private static readonly object cerrojo = new object();
        private static StreamWriter escritor;
        public static int Fallos;

        public static void Abrir(string ruta)
        {
            lock (cerrojo)
            {
                if (escritor != null) { Cerrar(); }
                FileStream fs = new FileStream(ruta, FileMode.Append, FileAccess.Write, FileShare.ReadWrite | FileShare.Delete);
                escritor = new StreamWriter(fs, new UTF8Encoding(false));
                escritor.AutoFlush = true;
            }
        }

        public static void Escribir(string texto)
        {
            lock (cerrojo)
            {
                if (escritor == null) { return; }
                try { escritor.WriteLine(texto); } catch (Exception e) { AnotarFallo("el registro", e); }
            }
        }

        public static void AnotarFallo(string donde, Exception e)
        {
            lock (cerrojo)
            {
                Fallos++;
                if (Fallos > 1) { return; }
                try { Console.Error.WriteLine("AVISO: no se pudo escribir en " + donde + " (" + e.Message + "); lo que falte no quedará anotado."); }
                catch (Exception) { }
            }
        }

        public static void Cerrar()
        {
            lock (cerrojo)
            {
                if (escritor == null) { return; }
                try { escritor.Dispose(); } catch (Exception e) { AnotarFallo("el registro", e); }
                escritor = null;
            }
        }
    }

    public static class Consola
    {
        // La pagina de codigos OEM del sistema (850 en espanol): la de una
        // consola nueva, en la que escriben taskkill, shutdown y compania.
        [DllImport("kernel32.dll")]
        public static extern int GetOEMCP();
    }

    // Un programa externo en marcha. Su salida se lee en hilos de .NET (en
    // PowerShell 5.1, un bloque de PowerShell como manejador de eventos corre
    // sin espacio de ejecucion y tumba el proceso). Cada linea va al
    // registro, o a Salida si se captura la salida estandar, y a la copia.
    public class Proceso
    {
        public Process P = new Process();
        public ConcurrentQueue<string> Salida = new ConcurrentQueue<string>();
        private readonly bool capturar;
        private StreamWriter copia;
        private readonly object cerrojoCopia = new object();
        private readonly ManualResetEvent finSalida = new ManualResetEvent(false);
        private readonly ManualResetEvent finError = new ManualResetEvent(false);

        public Proceso(ProcessStartInfo psi, string rutaCopia, bool capturar)
        {
            P.StartInfo = psi;
            this.capturar = capturar;
            if (!string.IsNullOrEmpty(rutaCopia))
            {
                copia = new StreamWriter(new FileStream(rutaCopia, FileMode.Create, FileAccess.Write, FileShare.ReadWrite), new UTF8Encoding(false));
                copia.AutoFlush = true;
            }
            P.OutputDataReceived += new DataReceivedEventHandler(AlLeerSalida);
            P.ErrorDataReceived += new DataReceivedEventHandler(AlLeerError);
        }

        public bool Empezado;
        private Thread escritorEntrada;

        // Corre en un hilo de lectura: nunca relanza (tumbaria powershell.exe).
        private void Anotar(string linea, bool deSalida)
        {
            if (deSalida && capturar) { Salida.Enqueue(linea); } else { Registro.Escribir(linea); }
            lock (cerrojoCopia)
            {
                try { if (copia != null) { copia.WriteLine(linea); } }
                catch (Exception e) { Registro.AnotarFallo("la copia de la salida de un programa", e); }
            }
        }

        private void AlLeerSalida(object o, DataReceivedEventArgs e)
        {
            if (e.Data == null) { finSalida.Set(); } else { Anotar(e.Data, true); }
        }

        private void AlLeerError(object o, DataReceivedEventArgs e)
        {
            if (e.Data == null) { finError.Set(); } else { Anotar(e.Data, false); }
        }

        // Arranca y escribe la entrada como bytes (sin BOM) en un hilo aparte:
        // un programa que no la lee bloquearia la escritura, y la espera de
        // ejecutar_programa no atenderia el tiempo maximo ni Ctrl+C. Salvo que
        // se pida dejarla abierta (el MCP), el hilo la cierra al terminar.
        public void Empezar(byte[] entrada, string archivoEntrada, bool dejarAbierta)
        {
            P.Start();
            Empezado = true;
            P.BeginOutputReadLine();
            P.BeginErrorReadLine();
            if (entrada == null && string.IsNullOrEmpty(archivoEntrada))
            {
                if (!dejarAbierta) { CerrarEntrada(); }
                return;
            }
            escritorEntrada = new Thread(delegate () { EscribirEntrada(entrada, archivoEntrada, dejarAbierta); });
            escritorEntrada.IsBackground = true;
            escritorEntrada.Start();
        }

        private void EscribirEntrada(byte[] entrada, string archivoEntrada, bool dejarAbierta)
        {
            try
            {
                Stream s = P.StandardInput.BaseStream;
                if (entrada != null) { s.Write(entrada, 0, entrada.Length); }
                if (!string.IsNullOrEmpty(archivoEntrada))
                {
                    using (FileStream f = File.OpenRead(archivoEntrada)) { f.CopyTo(s); }
                }
                s.Flush();
            }
            catch (Exception e)
            {
                // El programa ya habia terminado o se ha parado: lo dira su codigo de salida.
                Registro.Escribir("(no se pudo escribir su entrada: " + e.Message + ")");
            }
            finally
            {
                if (!dejarAbierta) { CerrarEntrada(); }
            }
        }

        public void EscribirLinea(string linea)
        {
            if (escritorEntrada != null) { escritorEntrada.Join(); }
            byte[] b = new UTF8Encoding(false).GetBytes(linea + "\n");
            Stream s = P.StandardInput.BaseStream;
            s.Write(b, 0, b.Length);
            s.Flush();
        }

        public void CerrarEntrada()
        {
            try { P.StandardInput.Close(); } catch (Exception) { }
        }

        // Tras salir el programa, espera a leer toda su salida, como mucho ms
        // milisegundos: un proceso hijo que siga vivo puede retenerla.
        public bool EsperarSalida(int ms)
        {
            DateTime limite = DateTime.UtcNow.AddMilliseconds(ms);
            bool a = finSalida.WaitOne(ms);
            int resto = (int)Math.Max(0, (limite - DateTime.UtcNow).TotalMilliseconds);
            bool b = finError.WaitOne(resto);
            lock (cerrojoCopia)
            {
                if (copia != null)
                {
                    try { copia.Dispose(); } catch (Exception e) { Registro.AnotarFallo("la copia de la salida de un programa", e); }
                    copia = null;
                }
            }
            return a && b;
        }
    }

    // Avisa a las ventanas de que cambio el entorno del usuario (el PATH):
    // las terminales que se abran despues lo ven (bloque A).
    public static class Entorno
    {
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, UIntPtr wParam, string lParam, uint flags, uint timeout, out UIntPtr result);

        public static void Avisar()
        {
            UIntPtr r;
            // HWND_BROADCAST, WM_SETTINGCHANGE, SMTO_ABORTIFHUNG, 5 s.
            SendMessageTimeout(new IntPtr(0xffff), 0x001A, UIntPtr.Zero, "Environment", 0x0002, 5000, out r);
        }
    }
}
'@
if (-not ('NeuroGraph.Proceso' -as [type])) { Add-Type -TypeDefinition $NG_CODIGO_CS }

$NG_PROYECTO = if ($env:NEUROGRAPH_PRUEBA_PROYECTO) { $env:NEUROGRAPH_PRUEBA_PROYECTO } else { 'neurograph-app' }
# neurograph-app y no NeuroGraph: la aplicacion de escritorio (Tauri) se
# instala en %LOCALAPPDATA%\neurograph, y Windows no distingue mayusculas
# (bloque A del diseno).
$NG_DIR = Join-Path $env:LOCALAPPDATA 'neurograph-app'
$NG_BIN = Join-Path $NG_DIR 'bin'
$NG_CONFIG = Join-Path $NG_DIR 'config.env'
$NG_ESTADO = Join-Path $NG_DIR 'estado.env'
$NG_AVISOS_ARCHIVO = Join-Path $NG_DIR '.avisos'
$NG_TOTAL = 9
# Marcas ASCII: la consola clasica de Windows 10 no muestra las de Linux (B3).
$NG_MARCA_OK = 'OK'
$NG_MARCA_AVISO = 'AVISO'
$NG_MARCA_FALLO = 'FALLO'
$NG_REGISTRO = ''
$NG_PASO = ''
$NG_RESUMEN = ''
$NG_MARCA = $NG_MARCA_OK
$NG_REPETIR = 'la misma orden'
$NG_ULTIMA_FRASE = ''
$NG_FALLO_MOSTRADO = $false
# Linea del paso en pantalla: 0 cerrada, 1 abierta esperando su marca,
# 2 interrumpida por un mensaje (la marca ira sangrada en otra linea).
$NG_LINEA = 0
$NG_CONTINUAR_EN = 0
$NG_LATIDO_ACTIVO = $false
$NG_LATIDO_ULTIMO = [DateTime]::Now
$NG_CTRL_C_PROPIO = $false
$NG_LIMPIANDO = $false
$NG_MODO_ESCRITORIO = $false
$NG_BLOQUEO = $null
$NG_ENTRADA_REVISADA = $false
$NG_ENTRADA_ORIGINAL = $null
$NG_CODIGO_SALIDA = 1

# --- Registro y pantalla

function registrar([string]$texto) { [NeuroGraph.Registro]::Escribir($texto) }
function fecha_iso { return (Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz') }
function fecha_corta { return (Get-Date -Format 'yyyy-MM-dd') }

function descripcion_windows {
  try {
    $v = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    return "$($v.ProductName) $($v.DisplayVersion), compilación $($v.CurrentBuildNumber).$($v.UBR), $($v.EditionID), $env:PROCESSOR_ARCHITECTURE"
  } catch { return 'Windows (sin datos de versión)' }
}

function iniciar_registro([string]$nombre) {  # nombre (instalar, desinstalar, abrir...)
  $dir = Join-Path $NG_DIR 'registro'
  [void](New-Item -ItemType Directory -Force -Path $dir)
  $script:NG_REGISTRO = Join-Path $dir ("$nombre-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
  [NeuroGraph.Registro]::Abrir($script:NG_REGISTRO)
  registrar "== $(fecha_iso) $nombre (pid $PID) =="
  registrar "sistema: $(descripcion_windows); PowerShell $($PSVersionTable.PSVersion)"
}

function interrumpir_linea {  # si la linea de un paso esta abierta, salta a otra
  if ($script:NG_LINEA -eq 1) { Write-Host ''; $script:NG_LINEA = 2 }
}

function decir([string]$texto = '') {  # pantalla (sangrado si va a mitad de un paso) y registro
  interrumpir_linea
  if ($script:NG_LINEA -eq 2) { Write-Host "      $texto" } else { Write-Host $texto }
  registrar "[pantalla] $texto"
}

function avisar([string]$texto) {  # se guarda para mostrarlo despues (pantalla final o abrir)
  [void](New-Item -ItemType Directory -Force -Path $NG_DIR)
  [IO.File]::AppendAllText($NG_AVISOS_ARCHIVO, "$texto`n", $NG_UTF8)
  registrar "[aviso] $texto"
}

function latido_tic {  # un punto cada 20 s en los pasos largos, para que no parezca colgado
  if (-not $script:NG_LATIDO_ACTIVO) { return }
  $cada = 20
  if ($env:NEUROGRAPH_PRUEBA_LATIDO_S) { $cada = [int]$env:NEUROGRAPH_PRUEBA_LATIDO_S }
  if (([DateTime]::Now - $script:NG_LATIDO_ULTIMO).TotalSeconds -ge $cada) {
    Write-Host -NoNewline '.'
    $script:NG_LATIDO_ULTIMO = [DateTime]::Now
  }
}

function marca_de_paso([string]$marca, [string]$resumen) {
  if ($script:NG_LINEA -eq 2) { Write-Host "      $marca  $resumen" } else { Write-Host " $marca  $resumen" }
  $script:NG_LINEA = 0
}

function paso {  # numero titulo funcion [-Largo]
  param([int]$Numero, [string]$Titulo, [string]$Funcion, [switch]$Largo)
  # Tras el reinicio del paso 2, los pasos ya hechos no se repiten.
  if ($Numero -lt $script:NG_CONTINUAR_EN) { return }
  $script:NG_PASO = $Numero
  $script:NG_RESUMEN = ''
  $script:NG_MARCA = $NG_MARCA_OK
  $puntos = [Math]::Max(2, 42 - $Titulo.Length)
  Write-Host -NoNewline ('[{0}/{1}] {2} {3}' -f $Numero, $NG_TOTAL, $Titulo, ('.' * $puntos))
  $script:NG_LINEA = 1
  registrar "== paso ${Numero}: $Titulo ($(Get-Date -Format 'HH:mm:ss')) =="
  $script:NG_LATIDO_ACTIVO = $Largo.IsPresent
  $script:NG_LATIDO_ULTIMO = [DateTime]::Now
  try { & $Funcion | ForEach-Object { registrar "(salida sin destino) $_" } }
  finally { $script:NG_LATIDO_ACTIVO = $false }
  marca_de_paso $script:NG_MARCA $script:NG_RESUMEN
  registrar "== paso $Numero hecho: $($script:NG_MARCA) $($script:NG_RESUMEN) =="
}

function cerrar_linea_de_paso {  # si un paso quedo a medias, lo marca con FALLO
  $script:NG_LATIDO_ACTIVO = $false
  if ($script:NG_LINEA -ne 0) { marca_de_paso $NG_MARCA_FALLO '' }
}

# --- Ctrl+C (B1): Ctrl+C llega como una tecla durante toda
# la ejecucion. Asi no lo recibe el cmd de instalar.cmd (no pregunta «¿Desea
# terminar el trabajo por lotes?») ni los programas, que se terminan aqui; y
# un segundo Ctrl+C durante la limpieza no la corta.

function ctrl_c_propio([bool]$activar) {
  if ([Console]::IsInputRedirected) { return }
  try {
    [Console]::TreatControlCAsInput = $activar
    $script:NG_CTRL_C_PROPIO = $activar
  } catch { registrar "consola: no se pudo cambiar el modo de Ctrl+C ($($_.Exception.Message))" }
}

function comprobar_interrupcion {  # lanza NG:interrumpido si se pulso Ctrl+C
  if ($script:NG_LIMPIANDO) { return }
  $marca = $env:NEUROGRAPH_PRUEBA_CTRL_C
  if ($marca -and (Test-Path -LiteralPath $marca)) {
    Remove-Item -LiteralPath $marca -Force
    throw 'NG:interrumpido'
  }
  if (-not $script:NG_CTRL_C_PROPIO) { return }
  while ([Console]::KeyAvailable) {
    $k = [Console]::ReadKey($true)
    if ($k.Key -eq [ConsoleKey]::C -and ($k.Modifiers -band [ConsoleModifiers]::Control)) { throw 'NG:interrumpido' }
  }
}

function esperar_segundos([double]$segundos) {  # Start-Sleep que atiende Ctrl+C y el latido
  $fin = [DateTime]::Now.AddSeconds($segundos)
  while ([DateTime]::Now -lt $fin) {
    Start-Sleep -Milliseconds 100
    comprobar_interrupcion
    latido_tic
  }
}

# --- Preguntas: solo con una consola de verdad delante; desde un acceso del
# menu Inicio o una prueba, la respuesta es no (B3).

function hay_quien_responda { return (-not $script:NG_MODO_ESCRITORIO) -and (-not [Console]::IsInputRedirected) }

function vaciar_teclado {  # lo tecleado durante los pasos no contesta la pregunta siguiente
  if ($script:NG_CTRL_C_PROPIO) { while ([Console]::KeyAvailable) { [void][Console]::ReadKey($true) } }
}

function leer_linea {  # con el Ctrl+C propio, ReadLine no lo veria
  if (-not $script:NG_CTRL_C_PROPIO) { return [Console]::ReadLine() }
  $texto = New-Object Text.StringBuilder
  while ($true) {
    $k = [Console]::ReadKey($true)
    if ($k.Key -eq [ConsoleKey]::C -and ($k.Modifiers -band [ConsoleModifiers]::Control)) { Write-Host ''; throw 'NG:interrumpido' }
    if ($k.Key -eq [ConsoleKey]::Enter) { Write-Host ''; return $texto.ToString() }
    if ($k.Key -eq [ConsoleKey]::Backspace) {
      if ($texto.Length -gt 0) { [void]$texto.Remove($texto.Length - 1, 1); Write-Host -NoNewline "`b `b" }
      continue
    }
    if ([char]::IsControl($k.KeyChar)) { continue }
    [void]$texto.Append($k.KeyChar)
    Write-Host -NoNewline $k.KeyChar
  }
}

function preguntar_si([string]$pregunta, [string]$defecto = 's') {  # -> $true si la respuesta es si
  if ($env:NEUROGRAPH_PRUEBA_RESPUESTA) {
    $r = $env:NEUROGRAPH_PRUEBA_RESPUESTA
  } elseif (hay_quien_responda) {
    interrumpir_linea
    $opciones = if ($defecto -eq 's') { '[S/n]' } else { '[s/N]' }
    vaciar_teclado
    Write-Host -NoNewline "      $pregunta $opciones "
    # El arnes de integracion espera esta linea para contestar con el teclado.
    registrar "esperando respuesta: $pregunta"
    $r = leer_linea
  } else {
    registrar "sin consola: no se pregunta «$pregunta» y se toma como no"
    return $false
  }
  registrar "pregunta: $pregunta -> $(if ($r) { $r } else { '(intro)' })"
  $r = "$r".Trim().ToLowerInvariant()
  if (-not $r) { $r = $defecto }
  return ($r -in 's', 'si', 'sí', 'y', 'yes')
}

function pedir_texto([string]$pregunta) {  # -> lo que escriba la persona (vacio sin consola)
  if ($env:NEUROGRAPH_PRUEBA_RESPUESTA) { return $env:NEUROGRAPH_PRUEBA_RESPUESTA }
  if (-not (hay_quien_responda)) { registrar "sin consola: no se pide «$pregunta»"; return '' }
  interrumpir_linea
  vaciar_teclado
  Write-Host -NoNewline "$pregunta "
  registrar "esperando respuesta: $pregunta"
  $r = leer_linea
  registrar "respuesta: $pregunta -> $r"
  return $r
}

# --- Fallos

function mostrar_fallo([string]$texto) {
  $script:NG_ULTIMA_FRASE = $texto
  cerrar_linea_de_paso
  decir ''
  decir $texto
  decir "Registro: $($script:NG_REGISTRO)"
  $script:NG_FALLO_MOSTRADO = $true
}

function fallar {  # codigo [dato...] -> frase, registro y la excepcion NG:fallo
  param([Parameter(Mandatory = $true, Position = 0)][string]$Codigo, [Parameter(ValueFromRemainingArguments = $true)][string[]]$Datos)
  $texto = frase $Codigo @Datos
  $p = if ($script:NG_PASO) { $script:NG_PASO } else { '?' }
  registrar "FALLO [$Codigo] en el paso ${p}: $texto"
  mostrar_fallo $texto
  throw 'NG:fallo'
}

# Un catch de la biblioteca nunca se traga un fallo, una interrupcion o un reinicio.
function relanzar_si_ng($e) { if ("$($e.Exception.Message)" -like 'NG:*') { throw $e } }

function raiz_hkcu {  # el registro de Windows del usuario (en las pruebas, una clave aparte)
  if ($env:NEUROGRAPH_PRUEBA_HKCU) { return $env:NEUROGRAPH_PRUEBA_HKCU }
  return 'HKCU:\'
}

# Un archivo abierto en exclusiva (B1): un segundo instalador, desinstalador
# o tractografia no puede abrirlo. Windows lo suelta al morir el proceso, y
# los procesos hijos no lo heredan.
function tomar_bloqueo {
  [void](New-Item -ItemType Directory -Force -Path $NG_DIR)
  try {
    $script:NG_BLOQUEO = [IO.File]::Open((Join-Path $NG_DIR '.bloqueo'), 'OpenOrCreate', 'ReadWrite', 'None')
  } catch {
    $x = $_.Exception
    while ($x.InnerException) { $x = $x.InnerException }
    # Solo si otro lo tiene abierto (32, ERROR_SHARING_VIOLATION; 33,
    # ERROR_LOCK_VIOLATION); otro error de E/S es otra cosa, y se dice como tal.
    if ($x -is [IO.IOException] -and ($x.HResult -band 0xFFFF) -in 32, 33) { fallar en_marcha }
    throw
  }
}

# --- Lanzar programas («Lanzar programas desde PowerShell» del diseno)

# Comillas de la linea de ordenes de Windows (las reglas de CommandLineToArgvW,
# que siguen los programas en C, Go y .NET): .NET Framework solo admite la
# linea entera, sin lista de argumentos. -ParaCmd: la linea la lee antes cmd
# (un .cmd), que parte la orden en & | < > sin comillas, toma ^ ( ) , ; = y
# los espacios como especiales y expande %VAR% (y !VAR!), tambien entre
# comillas: se entrecomilla todo argumento con alguno, y se rechazan ", %, !
# y los saltos de linea, que no tienen forma segura de pasar.
function citar_argumento([string]$a, [switch]$ParaCmd) {
  if ($ParaCmd -and $a -match "[`"%!`r`n]") { throw "ejecutar_programa: un argumento para un .cmd no puede llevar comillas dobles, %, ! ni saltos de línea: $a" }
  $especiales = if ($ParaCmd) { '[\s"&|<>^(),;=]' } else { '[\s"]' }
  if ($a.Length -gt 0 -and $a -notmatch $especiales) { return $a }
  $r = New-Object Text.StringBuilder
  [void]$r.Append('"')
  $barras = 0
  foreach ($c in $a.ToCharArray()) {
    if ($c -eq [char]'\') { $barras++; continue }
    if ($c -eq [char]'"') { [void]$r.Append([char]'\', 2 * $barras + 1); [void]$r.Append('"'); $barras = 0; continue }
    if ($barras -gt 0) { [void]$r.Append([char]'\', $barras); $barras = 0 }
    [void]$r.Append($c)
  }
  if ($barras -gt 0) { [void]$r.Append([char]'\', 2 * $barras) }
  [void]$r.Append('"')
  return $r.ToString()
}

# Busca un programa en el PATH como cmd, pero en cada carpeta prefiere .exe a
# .cmd y .bat, y estos a .ps1: npm deja los tres, y Get-Command elegiria el
# .ps1, que depende de la politica de ejecucion.
function resolver_programa([string]$nombre) {
  if ([IO.Path]::IsPathRooted($nombre)) {
    if (Test-Path -LiteralPath $nombre -PathType Leaf) { return $nombre }
    return $null
  }
  $extensiones = '.exe', '.cmd', '.bat', '.ps1'
  $con_extension = [IO.Path]::GetExtension($nombre).ToLowerInvariant() -in $extensiones
  foreach ($entrada in ($env:PATH -split ';')) {
    $d = $entrada.Trim().Trim('"')
    if (-not $d) { continue }
    try {
      $d = [Environment]::ExpandEnvironmentVariables($d)
      if ($con_extension) {
        $c = Join-Path $d $nombre
        if (Test-Path -LiteralPath $c -PathType Leaf) { return $c }
        continue
      }
      foreach ($e in $extensiones) {
        $c = Join-Path $d ($nombre + $e)
        if (Test-Path -LiteralPath $c -PathType Leaf) { return $c }
      }
    } catch { continue }  # una entrada del PATH con caracteres no validos
  }
  return $null
}

# En las pruebas de funciones (B8.1) nunca se lanza un programa de verdad:
# solo los falsos de la caja de la prueba.
function comprobar_simulado([string]$ruta) {
  $caja = $env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS
  if ($caja -and -not $ruta.StartsWith($caja, [StringComparison]::OrdinalIgnoreCase)) {
    throw "prueba: se iba a lanzar $ruta de verdad; simúlalo en la caja"
  }
}

# Process.Start crea la entrada estandar del programa con la codificacion de
# la consola, y .NET Framework escribe su BOM si la tiene (UTF-8 tras un
# «chcp 65001»): romperia el primer mensaje JSON del MCP o el ALTER ROLE. Se
# cambia solo en ese caso, y al_salir la deja como estaba.
function asegurar_entrada_sin_bom {
  if ($script:NG_ENTRADA_REVISADA) { return }
  $script:NG_ENTRADA_REVISADA = $true
  try {
    if ([Console]::InputEncoding.GetPreamble().Length -gt 0) {
      $script:NG_ENTRADA_ORIGINAL = [Console]::InputEncoding
      [Console]::InputEncoding = $NG_UTF8
    }
  } catch { registrar "consola: no se pudo revisar la codificación de la entrada ($($_.Exception.Message))" }
}

function codificacion_oem { return [Text.Encoding]::GetEncoding([NeuroGraph.Consola]::GetOEMCP()) }

# .NET Framework no termina el arbol de procesos: taskkill /T llega tambien a
# los hijos (el cmd de un .cmd, el docker que lanza). Escribe en la pagina
# OEM; las dos salidas se leen a la vez y antes de esperar (leidas una tras
# otra, la que se llena antes bloquearia a taskkill).
function detener_arbol([int]$id) {
  try {
    $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $env:SystemRoot 'System32\taskkill.exe'), "/T /F /PID $id"
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.StandardOutputEncoding = codificacion_oem
    $psi.StandardErrorEncoding = codificacion_oem
    $t = [Diagnostics.Process]::Start($psi)
    $salida = $t.StandardOutput.ReadToEndAsync()
    $errores = $t.StandardError.ReadToEndAsync()
    if (-not $t.WaitForExit(15000)) { registrar "taskkill ${id}: no terminó en 15 s"; return }
    $texto = ''
    foreach ($leido in $salida, $errores) { if ($leido.Wait(5000)) { $texto += $leido.Result } }
    registrar "taskkill ${id}: $($texto.Trim())"
  } catch { registrar "taskkill $id no se pudo lanzar: $($_.Exception.Message)" }
}

# Lanza un programa externo: TODOS pasan por aqui (B1). Devuelve Codigo
# (-1 si se agoto el tiempo), Salida (con -Capturar) y TiempoAgotado; con
# -SinEsperar, el proceso en marcha (Proceso), que se para con detener_proceso.
# -EntradaConsola: la entrada del programa es la de este proceso, sin
# redirigir (el WSL de serie se niega a --install y --update si su entrada no
# es una consola; Datos verificados del diseno, H11).
function ejecutar_programa {
  param(
    [Parameter(Mandatory = $true, Position = 0)][string]$Programa,
    [Parameter(Position = 1)][string[]]$Argumentos = @(),
    [int]$TiempoMax = 0,
    [switch]$Capturar,
    [ValidateSet('utf8', 'unicode', 'oem')][string]$Codificacion = 'utf8',
    [hashtable]$Entorno = @{},
    [string]$Entrada,
    [string]$EntradaArchivo,
    [string]$Copia,
    [string]$Directorio,
    [switch]$SinEsperar,
    [switch]$EntradaConsola
  )
  $ruta = resolver_programa $Programa
  if (-not $ruta) { fallar programa $Programa }
  comprobar_simulado $ruta
  # Antes de lanzarlo: sin su entrada, el programa correria con otra cosa.
  if ($EntradaArchivo -and -not (Test-Path -LiteralPath $EntradaArchivo -PathType Leaf)) { throw "ejecutar_programa: no existe el archivo de entrada $EntradaArchivo" }
  if ($EntradaConsola -and ($PSBoundParameters.ContainsKey('Entrada') -or $EntradaArchivo -or $SinEsperar)) { throw 'ejecutar_programa: -EntradaConsola no admite -Entrada, -EntradaArchivo ni -SinEsperar' }
  asegurar_entrada_sin_bom
  $extension = [IO.Path]::GetExtension($ruta).ToLowerInvariant()
  $es_cmd = $extension -eq '.cmd' -or $extension -eq '.bat'
  $linea = (@($Argumentos) | ForEach-Object { citar_argumento $_ -ParaCmd:$es_cmd }) -join ' '
  if ($es_cmd) {
    # /d: sin AutoRun; /v:off: sin la expansion de !VAR!, aunque el registro
    # la active; con /s, cmd solo quita las comillas de fuera. La ruta, siempre
    # entre comillas (un & en una carpeta partiria la orden).
    if ($ruta -match '[%!]') { throw "ejecutar_programa: la ruta de un .cmd no puede llevar % ni !: $ruta" }
    $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $env:SystemRoot 'System32\cmd.exe'), ('/d /v:off /s /c ""' + $ruta + '" ' + $linea + '"')
  } elseif ($extension -eq '.ps1') {
    $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $PSHOME 'powershell.exe'), ('-NoProfile -ExecutionPolicy Bypass -File ' + (citar_argumento $ruta) + ' ' + $linea)
  } else {
    $psi = New-Object Diagnostics.ProcessStartInfo $ruta, $linea
  }
  $psi.UseShellExecute = $false
  # Consola propia y oculta: el programa no comparte la de la persona ni su Ctrl+C.
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = -not $EntradaConsola
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  # Cada programa en la suya: wsl.exe sin WSL_UTF8 en UTF-16; taskkill y
  # shutdown, en la pagina OEM de su consola.
  $codificacion_salida = switch ($Codificacion) { 'unicode' { New-Object Text.UnicodeEncoding($false, $false) } 'oem' { codificacion_oem } default { $NG_UTF8 } }
  $psi.StandardOutputEncoding = $codificacion_salida
  $psi.StandardErrorEncoding = $codificacion_salida
  if ($Directorio) { $psi.WorkingDirectory = $Directorio }
  foreach ($k in $Entorno.Keys) { $psi.EnvironmentVariables[$k] = [string]$Entorno[$k] }
  # La linea de ordenes al registro: nunca lleva la contrasena (va por config.env o por la entrada).
  registrar "orden: $Programa $linea"
  $p = New-Object NeuroGraph.Proceso($psi, $Copia, $Capturar.IsPresent)
  $bytes = $null
  if ($PSBoundParameters.ContainsKey('Entrada')) { $bytes = $NG_UTF8.GetBytes($Entrada) }
  $reloj = [Diagnostics.Stopwatch]::StartNew()
  $agotado = $false
  try {
    $p.Empezar($bytes, $EntradaArchivo, $SinEsperar.IsPresent)
    if ($SinEsperar) { return [pscustomobject]@{ Proceso = $p; Programa = $Programa } }
    while (-not $p.P.WaitForExit(100)) {
      comprobar_interrupcion
      latido_tic
      if ($TiempoMax -gt 0 -and $reloj.Elapsed.TotalSeconds -ge $TiempoMax) {
        registrar "tiempo agotado ($TiempoMax s): $Programa"
        $agotado = $true
        detener_arbol $p.P.Id
        [void]$p.P.WaitForExit(10000)
        break
      }
    }
  } catch {
    # Ctrl+C, un fallo de la espera o al arrancarlo: el programa no sigue solo
    # (B1), y su copia de la salida se cierra (si no, el archivo no se podria borrar).
    $espera = 0
    if ($p.Empezado) { detener_arbol $p.P.Id; $espera = 5000 }
    [void]$p.EsperarSalida($espera)
    throw
  }
  if (-not $p.EsperarSalida(10000)) { registrar "aviso: la salida de $Programa sigue abierta (un proceso hijo la retiene)" }
  $codigo = if ($agotado) { -1 } else { $p.P.ExitCode }
  registrar "codigo ${codigo}: $Programa ($([int]$reloj.Elapsed.TotalSeconds) s)"
  return [pscustomobject]@{ Codigo = $codigo; Salida = @($p.Salida.ToArray()); TiempoAgotado = $agotado }
}

function detener_proceso($r) {  # el objeto de ejecutar_programa -SinEsperar -> su codigo
  $p = $r.Proceso
  if (-not $p.P.HasExited) {
    detener_arbol $p.P.Id
    [void]$p.P.WaitForExit(10000)
  }
  if (-not $p.EsperarSalida(5000)) { registrar "aviso: la salida de $($r.Programa) sigue abierta" }
  if ($p.P.HasExited) { return $p.P.ExitCode }
  return -1
}

# Programas de ventana (Docker Desktop, el navegador, el Bloc de notas): se
# abren con el shell de Windows, sin esperar ni heredar la consola. En las
# pruebas se anotan en vez de abrirse, y un archivo de la caja dice que se
# abrio (abierto-<nombre>), para que un programa falso cambie de respuesta.
function lanzar_aplicacion([string]$ruta, [string]$argumentos = '') {
  registrar "abriendo: $ruta $argumentos"
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) {
    [IO.File]::AppendAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'aplicaciones'), "$ruta $argumentos`n", $NG_UTF8)
    if (Test-Path -LiteralPath $ruta -PathType Leaf) {
      [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_CAJA ('abierto-' + [IO.Path]::GetFileName($ruta))), '')
    }
    return
  }
  if ($argumentos) { Start-Process -FilePath $ruta -ArgumentList $argumentos } else { Start-Process -FilePath $ruta }
}

# --- El cuerpo de cada ejecutable

# Abre el registro, activa el Ctrl+C propio y ejecuta el cuerpo. La excepcion
# decide el codigo: NG:fallo 1, NG:interrumpido 130, NG:reiniciar 3010; otra
# cualquiera es un fallo inesperado (frase generica y su rastro al registro).
# Lo que el cuerpo deje en el pipeline va al registro, nunca a la pantalla.
# El codigo queda en $NG_CODIGO_SALIDA: el ejecutable sale con el.
function ejecutar_principal([string]$Nombre, [scriptblock]$Cuerpo) {
  $script:NG_CODIGO_SALIDA = 1
  try {
    iniciar_registro $Nombre
    ctrl_c_propio $true
    & $Cuerpo | ForEach-Object { registrar "(salida sin destino) $_" }
    $script:NG_CODIGO_SALIDA = 0
  } catch {
    $script:NG_CODIGO_SALIDA = resolver_error $_
  } finally {
    al_salir $script:NG_CODIGO_SALIDA
  }
}

function resolver_error($e) {
  switch ("$($e.Exception.Message)") {
    'NG:fallo' { return 1 }
    'NG:reiniciar' { return 3010 }
    'NG:interrumpido' {
      registrar 'Interrumpido por la persona (Ctrl+C).'
      mostrar_fallo "Interrumpido. Puedes volver a ejecutar $($script:NG_REPETIR): seguirá donde haga falta."
      return 130
    }
  }
  # La linea del error es el texto del codigo, no sus valores: la contrasena no llega aqui.
  $p = if ($script:NG_PASO) { $script:NG_PASO } else { '?' }
  registrar "ERROR inesperado en el paso ${p}: $($e.Exception.Message)"
  registrar $e.InvocationInfo.PositionMessage
  registrar $e.ScriptStackTrace
  if (-not $script:NG_FALLO_MOSTRADO) { mostrar_fallo (frase inesperado) }
  return 1
}

# Cada ejecutable define al_salir_extra (su limpieza) si la necesita.
function al_salir([int]$codigo) {
  $script:NG_LATIDO_ACTIVO = $false
  $script:NG_LIMPIANDO = $true  # un segundo Ctrl+C no corta la limpieza (B1)
  if (Get-Command -Name al_salir_extra -CommandType Function -ErrorAction SilentlyContinue) {
    try { al_salir_extra $codigo } catch { registrar "ERROR en la limpieza: $($_.Exception.Message)"; registrar $_.ScriptStackTrace }
  }
  if ($script:NG_ENTRADA_ORIGINAL) { try { [Console]::InputEncoding = $script:NG_ENTRADA_ORIGINAL } catch { } }
  if ($script:NG_SALIDA_ORIGINAL) { try { [Console]::OutputEncoding = $script:NG_SALIDA_ORIGINAL } catch { } }
  registrar "== fin (estado $codigo) $(fecha_iso) =="
  [NeuroGraph.Registro]::Cerrar()
  if ($script:NG_BLOQUEO) { $script:NG_BLOQUEO.Dispose(); $script:NG_BLOQUEO = $null }
  # Lo tecleado durante la ejecucion no contesta la pausa de instalar.cmd.
  try { vaciar_teclado } catch { }
  ctrl_c_propio $false
}
