mod backend;
mod postgres;
mod setup;

use std::sync::Mutex;
use tauri::{Manager, WindowEvent};

struct AppState {
    services: Mutex<Option<setup::RunningServices>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let handle = app.handle().clone();
            match setup::ensure_running(&handle) {
                Ok(services) => {
                    app.manage(AppState {
                        services: Mutex::new(Some(services)),
                    });
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                    }
                }
                Err(e) => {
                    // Nunca un arranque a medias disfrazado de éxito: se
                    // registra el error real y se cierra, en vez de dejar
                    // una ventana abierta sin backend ni base de datos
                    // detrás. Sustituir esto por un diálogo de error real
                    // en vez de un cierre silencioso es trabajo pendiente
                    // explícito, señalado en la decisión 54.
                    eprintln!("Fallo al preparar NeuroGraph: {e}");
                    if let Ok(data_dir) = app.path().app_data_dir() {
                        let _ = std::fs::write(data_dir.join("setup_error.log"), &e);
                    }
                    std::process::exit(1);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle();
                if let Some(state) = app.try_state::<AppState>() {
                    if let Some(mut services) = state.services.lock().unwrap().take() {
                        setup::shutdown(app, &mut services);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
