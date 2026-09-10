fn main() {
    // Sin esto, Cargo no vuelve a copiar `resources/` a `target/<perfil>/resources/`
    // cuando solo cambian archivos DENTRO de esa carpeta (binarios de Postgres,
    // migraciones, el volcado, el backend empaquetado) sin tocar ningún .rs --
    // Cargo decide si hace falta re-ejecutar este script de build mirando
    // solo las rutas declaradas aquí, y sin esta línea no vigilaba
    // `resources/` en absoluto. Encontrado de verdad (decisión 58 de
    // docs/analisis-arquitectura.md): tras añadir pgvector a
    // resources/postgres/, `cargo tauri dev` siguió usando la copia vieja
    // en target/debug/resources/ porque no había recompilado nada.
    println!("cargo:rerun-if-changed=resources");
    tauri_build::build()
}
