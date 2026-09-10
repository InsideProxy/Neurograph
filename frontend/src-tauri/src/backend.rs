// Arranque del backend Python empaquetado (PyInstaller, modo "one-folder"
// -- ver decisión 54 de docs/analisis-arquitectura.md) y espera activa a
// que esté realmente listo, vía su propio endpoint GET /health
// (backend/api/main.py, ya existente).

use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

use crate::postgres;

// Mismo puerto que ya usa el backend real dentro de Docker
// (docker-compose.yml, servicio "api") -- se mantiene igual a propósito,
// nunca un valor distinto sin motivo.
pub const PORT: u16 = 8420;

const READY_TIMEOUT: Duration = Duration::from_secs(30);

// CREATE_NO_WINDOW (constante real de la API de Windows, no un valor
// inventado -- winbase.h) -- evita que la ventana de consola del backend
// empaquetado parpadee un instante al arrancar, ya que el .spec de
// PyInstaller (scripts/packaging/backend.spec) genera un ejecutable con
// subsistema de consola a propósito (para que la redirección de
// stdout/stderr a logs/backend.log funcione igual que en cualquier otro
// proceso). SIN VERIFICAR TODAVÍA contra un build real de Windows -- es
// código exclusivo de esa plataforma (`#[cfg(windows)]`), que este
// entorno Linux no puede compilar ni comprobar; primer punto a revisar en
// la primera compilación real (decisión 54).
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Mismo motivo que en postgres.rs: en Windows, `cargo tauri dev` resuelve
/// las rutas de recursos con el prefijo de ruta extendida (`\\?\...`), que
/// algunos programas nativos rompen al reconstruir rutas internamente. No
/// hace falta para invocar el propio `.exe` directamente (`CreateProcess`
/// lo acepta bien como ruta principal), pero se normaliza aquí también por
/// consistencia y por si el bootloader de PyInstaller reconstruye su
/// propia ruta internamente en algún escenario -- más barato quitarlo
/// siempre que dejar la puerta abierta a un bug igual al de la decisión 57.
fn strip_verbatim_prefix(path: PathBuf) -> PathBuf {
    match path.to_str() {
        Some(s) => match s.strip_prefix(r"\\?\") {
            Some(stripped) => PathBuf::from(stripped),
            None => path,
        },
        None => path,
    }
}

fn resource_exe(app: &AppHandle) -> Result<PathBuf, String> {
    // Nombre del ejecutable fijado por el .spec de PyInstaller
    // (scripts/packaging/backend.spec) -- si cambia ahí, tiene que
    // cambiar aquí también.
    app.path()
        .resolve(
            "resources/backend/neurograph-backend/neurograph-backend.exe",
            BaseDirectory::Resource,
        )
        .map(strip_verbatim_prefix)
        .map_err(|e| format!("No se encuentra el backend empaquetado: {e}"))
}

pub fn start(app: &AppHandle, logs: &Path) -> Result<Child, String> {
    let exe = resource_exe(app)?;

    let logfile = std::fs::File::create(logs.join("backend.log"))
        .map_err(|e| format!("No se pudo crear el log del backend: {e}"))?;
    let logfile_err = logfile
        .try_clone()
        .map_err(|e| format!("No se pudo duplicar el descriptor del log del backend: {e}"))?;

    #[allow(unused_mut)]
    let mut cmd = Command::new(&exe);
    cmd.env("NEUROGRAPH_DATABASE__HOST", "127.0.0.1")
        .env("NEUROGRAPH_DATABASE__PORT", postgres::PORT.to_string())
        .env("NEUROGRAPH_DATABASE__USER", postgres::DB_USER)
        // Autenticación 'trust' del Postgres embebido (decisión 54): sin
        // contraseña real que gestionar ni guardar.
        .env("NEUROGRAPH_DATABASE__PASSWORD", "")
        .env("NEUROGRAPH_DATABASE__NAME", postgres::DB_NAME)
        .env("NEUROGRAPH_BACKEND_HOST", "127.0.0.1")
        .env("NEUROGRAPH_BACKEND_PORT", PORT.to_string())
        .stdout(Stdio::from(logfile))
        .stderr(Stdio::from(logfile_err));

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.spawn()
        .map_err(|e| format!("No se pudo arrancar el backend ({}): {e}", exe.display()))
}

/// Sondeo activo de `GET /health` (backend/api/main.py, ya existente)
/// hasta que responda -- no basta con que el puerto acepte conexiones
/// (podría estar aceptando ya pero seguir importando numpy/scipy/pandas/
/// nibabel, la decisión 32 ya documentó que ese arranque en frío tarda
/// varios segundos), así que se comprueba de verdad la respuesta real del
/// endpoint, sin ninguna dependencia HTTP nueva en Cargo.toml (una
/// petición HTTP/1.1 mínima escrita a mano sobre `TcpStream`).
pub fn wait_until_ready(port: u16) -> Result<(), String> {
    let deadline = Instant::now() + READY_TIMEOUT;
    let request =
        format!("GET /health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n");

    while Instant::now() < deadline {
        if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
            if stream.write_all(request.as_bytes()).is_ok() {
                let mut buf = [0u8; 32];
                if let Ok(n) = stream.read(&mut buf) {
                    let head = String::from_utf8_lossy(&buf[..n]);
                    if head.starts_with("HTTP/1.1 200") || head.starts_with("HTTP/1.0 200") {
                        return Ok(());
                    }
                }
            }
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    Err(format!(
        "El backend no respondió en /health (puerto {port}) tras {} segundos -- revisa 'backend.log' en la carpeta de datos.",
        READY_TIMEOUT.as_secs()
    ))
}
