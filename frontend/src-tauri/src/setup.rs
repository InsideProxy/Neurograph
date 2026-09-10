// Orquestación del primer arranque y de los arranques siguientes: Postgres
// embebido + backend Python empaquetado. Diseño completo y su
// justificación en la decisión 54 de docs/analisis-arquitectura.md -- este
// módulo es su implementación real.

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::backend;
use crate::postgres;

const SETUP_MARKER: &str = ".setup_complete";

pub struct RunningServices {
    pub backend: std::process::Child,
}

/// Prepara y arranca Postgres + el backend, devolviendo el proceso del
/// backend (para poder terminarlo al cerrar la ventana). Nunca deja el
/// marcador de "primer arranque completo" escrito si algo falla a medias
/// -- ver postgres::run_first_time_setup.
pub fn ensure_running(app: &AppHandle) -> Result<RunningServices, String> {
    let data_dir = app_data_root(app)?;
    fs::create_dir_all(&data_dir).map_err(|e| {
        format!(
            "No se pudo crear la carpeta de datos ({}): {e}",
            data_dir.display()
        )
    })?;

    let pgdata = data_dir.join("pgdata");
    let logs = data_dir.join("logs");
    fs::create_dir_all(&logs).map_err(|e| format!("No se pudo crear la carpeta de logs: {e}"))?;

    let marker = data_dir.join(SETUP_MARKER);

    if !marker.exists() {
        // Primer arranque: si queda algo a medias de un intento anterior
        // fallido, se borra primero -- seguro por construcción, en este
        // punto nunca hay datos reales de la usuaria que perder (decisión
        // 54).
        if pgdata.exists() {
            fs::remove_dir_all(&pgdata)
                .map_err(|e| format!("No se pudo limpiar un 'pgdata' a medio construir: {e}"))?;
        }
        postgres::run_first_time_setup(app, &pgdata, &logs)?;
        fs::write(&marker, b"")
            .map_err(|e| format!("No se pudo escribir el marcador de arranque completo: {e}"))?;
    } else {
        postgres::start_existing(app, &pgdata, &logs)?;
    }

    let backend_child = backend::start(app, &logs)?;
    backend::wait_until_ready(backend::PORT)?;

    Ok(RunningServices {
        backend: backend_child,
    })
}

/// Parada ordenada: primero el backend (para que deje de intentar hablar
/// con Postgres), luego Postgres con `pg_ctl stop -m fast` -- nunca matar
/// el proceso de golpe (decisión 54).
pub fn shutdown(app: &AppHandle, services: &mut RunningServices) {
    let _ = services.backend.kill();
    let _ = services.backend.wait();

    if let Ok(data_dir) = app_data_root(app) {
        let pgdata = data_dir.join("pgdata");
        let _ = postgres::stop(app, &pgdata);
    }
}

fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver la carpeta de datos de la aplicación: {e}"))
}
