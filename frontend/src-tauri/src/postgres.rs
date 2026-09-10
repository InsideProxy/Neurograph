// Arranque, parada e inicialización del Postgres embebido. Ver la
// decisión 54 de docs/analisis-arquitectura.md para el diseño completo y
// su justificación (puerto, autenticación, por qué std::process::Command
// directo y nunca una shell).

use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

pub const PORT: u16 = 5433;
pub const DB_NAME: &str = "neurograph";
pub const DB_USER: &str = "neurograph";

/// En Windows, `cargo tauri dev` resuelve las rutas de recursos ya
/// canonicalizadas con el prefijo de ruta extendida de Windows (`\\?\...`).
/// PostgreSQL convierte internamente las barras invertidas a barras
/// normales al construir la línea de comandos de sus propios subprocesos
/// (p.ej. `initdb` invocando `postgres -V` para comprobar la versión) --
/// eso rompe el prefijo `\\?\`, que exige backslashes literales para
/// significar "ruta extendida", y el resultado (`//?/E:/...`) deja de ser
/// una ruta válida para Windows. Visto de verdad en el primer intento real
/// (decisión 57 de docs/analisis-arquitectura.md): "El sistema no puede
/// encontrar la ruta especificada". Se quita el prefijo aquí mismo, antes
/// de pasarle ninguna ruta a un binario de Postgres.
fn strip_verbatim_prefix(path: PathBuf) -> PathBuf {
    match path.to_str() {
        Some(s) => match s.strip_prefix(r"\\?\") {
            Some(stripped) => PathBuf::from(stripped),
            None => path,
        },
        None => path,
    }
}

fn resource_bin(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    app.path()
        .resolve(
            format!("resources/postgres/bin/{name}"),
            BaseDirectory::Resource,
        )
        .map(strip_verbatim_prefix)
        .map_err(|e| format!("No se encuentra '{name}' en los recursos empaquetados: {e}"))
}

fn resource_migrations_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resolve("resources/migrations", BaseDirectory::Resource)
        .map(strip_verbatim_prefix)
        .map_err(|e| format!("No se encuentra la carpeta de migraciones empaquetada: {e}"))
}

fn resource_snapshot(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resolve("resources/neurograph_snapshot.sql", BaseDirectory::Resource)
        .map(strip_verbatim_prefix)
        .map_err(|e| format!("No se encuentra el volcado de datos empaquetado: {e}"))
}

/// Primer arranque: initdb -> arrancar -> crear la base de datos -> las 13
/// migraciones en orden -> el volcado de datos real (decisión 53). Cada
/// paso se comprueba antes de seguir al siguiente -- ningún fallo se
/// disfraza de éxito.
pub fn run_first_time_setup(app: &AppHandle, pgdata: &Path, logs: &Path) -> Result<(), String> {
    run_initdb(app, pgdata)?;
    start_server(app, pgdata, logs)?;

    // A partir de aquí, si algo falla hay que parar el servidor que
    // acabamos de arrancar antes de devolver el error -- si no, quedaría
    // un proceso de Postgres huérfano corriendo en segundo plano.
    let result = (|| -> Result<(), String> {
        create_database(app)?;
        apply_migrations(app)?;
        apply_snapshot(app)?;
        Ok(())
    })();

    if let Err(e) = result {
        let _ = stop(app, pgdata);
        return Err(e);
    }

    Ok(())
}

pub fn start_existing(app: &AppHandle, pgdata: &Path, logs: &Path) -> Result<(), String> {
    start_server(app, pgdata, logs)
}

fn run_initdb(app: &AppHandle, pgdata: &Path) -> Result<(), String> {
    let initdb = resource_bin(app, "initdb.exe")?;
    let status = Command::new(&initdb)
        .arg("-D")
        .arg(pgdata)
        .arg("-U")
        .arg(DB_USER)
        .arg("-E")
        .arg("UTF8")
        .arg("--locale=C")
        .arg("-A")
        .arg("trust")
        .status()
        .map_err(|e| format!("No se pudo ejecutar initdb ({}): {e}", initdb.display()))?;

    if !status.success() {
        return Err(format!(
            "initdb terminó con error (código {:?})",
            status.code()
        ));
    }
    Ok(())
}

fn start_server(app: &AppHandle, pgdata: &Path, logs: &Path) -> Result<(), String> {
    let pg_ctl = resource_bin(app, "pg_ctl.exe")?;
    let logfile = logs.join("postgres.log");
    let opts = format!("-c listen_addresses=127.0.0.1 -c port={PORT}");

    let status = Command::new(&pg_ctl)
        .arg("start")
        .arg("-D")
        .arg(pgdata)
        .arg("-l")
        .arg(&logfile)
        // esperar a que el servidor esté listo antes de devolver el
        // control -- pg_ctl ya hace este sondeo por nosotros, no hace
        // falta reimplementarlo.
        .arg("-w")
        .arg("-o")
        .arg(&opts)
        .status()
        .map_err(|e| {
            format!(
                "No se pudo ejecutar pg_ctl start ({}): {e}",
                pg_ctl.display()
            )
        })?;

    if !status.success() {
        return Err(format!(
            "Postgres no arrancó (pg_ctl salió con código {:?}) -- revisa '{}'",
            status.code(),
            logfile.display()
        ));
    }
    Ok(())
}

pub fn stop(app: &AppHandle, pgdata: &Path) -> Result<(), String> {
    let pg_ctl = resource_bin(app, "pg_ctl.exe")?;
    let status = Command::new(&pg_ctl)
        .arg("stop")
        .arg("-D")
        .arg(pgdata)
        .arg("-m")
        .arg("fast")
        .status()
        .map_err(|e| format!("No se pudo ejecutar pg_ctl stop: {e}"))?;

    if !status.success() {
        return Err(format!(
            "pg_ctl stop terminó con error (código {:?})",
            status.code()
        ));
    }
    Ok(())
}

fn create_database(app: &AppHandle) -> Result<(), String> {
    let createdb = resource_bin(app, "createdb.exe")?;
    let status = Command::new(&createdb)
        .arg("-h")
        .arg("127.0.0.1")
        .arg("-p")
        .arg(PORT.to_string())
        .arg("-U")
        .arg(DB_USER)
        .arg(DB_NAME)
        .status()
        .map_err(|e| format!("No se pudo ejecutar createdb: {e}"))?;

    if !status.success() {
        return Err(format!(
            "createdb terminó con error (código {:?})",
            status.code()
        ));
    }
    Ok(())
}

fn run_psql_file(app: &AppHandle, file: &Path, single_transaction: bool) -> Result<(), String> {
    let psql = resource_bin(app, "psql.exe")?;
    let mut cmd = Command::new(&psql);
    cmd.arg("-h")
        .arg("127.0.0.1")
        .arg("-p")
        .arg(PORT.to_string())
        .arg("-U")
        .arg(DB_USER)
        .arg("-d")
        .arg(DB_NAME)
        // Nunca seguir en silencio tras un error real -- mismo criterio
        // de "nunca un fallo a medias disfrazado de éxito" que rige el
        // resto de este proyecto.
        .arg("-v")
        .arg("ON_ERROR_STOP=1");

    if single_transaction {
        // Las migraciones ya vienen envueltas en su propio BEGIN/COMMIT
        // (SQL generado por 'alembic upgrade --sql', ver
        // backend/database/migrations/generated/); el volcado de datos
        // (pg_dump --data-only en texto plano, decisión 53) NO lo está,
        // así que aquí sí hace falta pedirle a psql que envuelva todo el
        // archivo en una única transacción -- si falla a mitad, que no
        // deje datos a medio cargar.
        cmd.arg("--single-transaction");
    }

    let status = cmd
        .arg("-f")
        .arg(file)
        .status()
        .map_err(|e| format!("No se pudo ejecutar psql sobre '{}': {e}", file.display()))?;

    if !status.success() {
        return Err(format!(
            "psql terminó con error al aplicar '{}' (código {:?})",
            file.display(),
            status.code()
        ));
    }
    Ok(())
}

fn apply_migrations(app: &AppHandle) -> Result<(), String> {
    let dir = resource_migrations_dir(app)?;
    let mut files: Vec<PathBuf> = std::fs::read_dir(&dir)
        .map_err(|e| {
            format!(
                "No se pudo leer la carpeta de migraciones '{}': {e}",
                dir.display()
            )
        })?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.extension().map(|ext| ext == "sql").unwrap_or(false))
        // backend/database/migrations/generated/ contiene, además de las
        // migraciones reales, al menos un archivo "*_verify.sql"
        // (0001_verify.sql): un script de comprobación para desarrolladoras
        // que inserta datos de PRUEBA y termina con una comprobación
        // NEGATIVA a propósito (una inserción que debe violar una clave
        // foránea, para confirmar que la integridad referencial está
        // activa), todo envuelto en BEGIN/ROLLBACK. Aplicarlo aquí con
        // ON_ERROR_STOP=1 abortaría el primer arranque real en todas las
        // instalaciones, porque psql ve ese error deliberado como un fallo
        // real. No es una migración -- se excluye explícitamente, nunca
        // por accidente de que su nombre ordene de cierta forma.
        .filter(|path| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .map(|s| !s.ends_with("_verify"))
                .unwrap_or(true)
        })
        .collect();

    // Orden numérico explícito (0001, 0002, ...) -- nunca el orden que dé
    // el sistema de archivos, que no está garantizado.
    files.sort();

    if files.is_empty() {
        return Err(format!(
            "No se encontró ninguna migración en '{}'",
            dir.display()
        ));
    }

    for file in files {
        run_psql_file(app, &file, false)?;
    }
    Ok(())
}

fn apply_snapshot(app: &AppHandle) -> Result<(), String> {
    let file = resource_snapshot(app)?;
    run_psql_file(app, &file, true)
}
