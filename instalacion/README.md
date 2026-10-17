# Instalar NeuroGraph en Linux

¿Usas Windows? Ve a [Instalar NeuroGraph en Windows](#instalar-neurograph-en-windows).

NeuroGraph se instala con una sola orden. El instalador prepara lo que haga falta (también Docker, si no lo tienes), carga los datos y comprueba que todo responde. Al terminar tendrás dos iconos en el menú de aplicaciones: uno para abrir NeuroGraph en el navegador y otro para apagarlo.

## Qué necesitas

- **La carpeta de NeuroGraph**, ya descargada en tu ordenador.
- **Linux**: Ubuntu, una distribución basada en Ubuntu (Linux Mint, Pop!_OS, Zorin OS…) o Debian. En otra distribución también funciona si ya tienes Docker y curl instalados.
- **Conexión a internet.**
- **Espacio libre**: unos 3,5 GB para Docker, 1,7 GB más mientras se instala la tractografía y 1 GB en la carpeta de la biblioteca (por defecto, `~/NeuroData`).
- **Memoria libre**: al menos 2 GB, y 4 GB para la tractografía. Con entre 2 y 4 GB, NeuroGraph se instala igual y la tractografía queda pendiente para más tarde.
- **Tu contraseña de administrador**, solo si hay que instalar algo (Docker o curl), arrancar Docker o darte permiso para usarlo.

No hace falta que lo compruebes tú: el instalador lo mira al empezar y te dice qué falta. Se ha probado en ordenadores x86_64, los habituales con procesador Intel o AMD.

## Instalar

Abre la carpeta de NeuroGraph en el gestor de archivos, haz clic derecho en un hueco vacío y elige «Abrir en una terminal». En la terminal, escribe:

```
./instalacion/linux/instalar.sh
```

El instalador va paso a paso (nueve en total) y marca cada uno al terminarlo. Solo te pide algo cuando hace falta:

- dónde guardar la biblioteca de datos, solo la primera vez (ver más abajo);
- tu contraseña de administrador, en los casos de arriba;
- si quieres conectar NeuroGraph con las IAs de terminal que encuentre (Claude Code, Codex CLI o Gemini CLI).

En nuestro equipo de pruebas, con Docker ya instalado, tardó unos 5 minutos. En un ordenador nuevo tarda más, porque antes descarga Docker y las piezas de NeuroGraph.

**La biblioteca de datos** (la tractografía, unos 630 MB) puede ir en otra carpeta o en otro disco, por ejemplo un SSD externo. La primera vez el instalador te propone `~/NeuroData`, o la biblioteca de NeuroGraph que encuentre en un disco conectado. Si prefieres otra, contesta que no y escribe la carpeta, o arrástrala desde el gestor de archivos a la terminal. La respuesta se guarda y no se vuelve a preguntar. También puedes darla directamente:

```
./instalacion/linux/instalar.sh --biblioteca /ruta/a/la/carpeta
```

Si el disco de la biblioteca se desconecta, NeuroGraph sigue funcionando: la tractografía ya está cargada. Solo hace falta conectarlo para volver a instalarla.

Si se corta (sin red, Ctrl+C, un apagón), vuelve a ejecutarlo: lo que ya estaba hecho se comprueba en segundos, y una base de datos ya cargada nunca se borra.

## Abrir y apagar

- **Abrir**: el icono «NeuroGraph» o, en una terminal, `neurograph abrir`. Si estaba apagado, lo enciende y abre el navegador.
- **Apagar**: el icono «Apagar NeuroGraph» o `neurograph apagar`. Tus datos se conservan.
- **Ver cómo está**: `neurograph estado`.

Si justo después de instalar la terminal dice que no encuentra la orden `neurograph`, cierra la sesión y vuelve a entrar. Mientras tanto, usa los iconos o la ruta completa, `~/.local/bin/neurograph`.

NeuroGraph apagado no gasta memoria. Encendido usa unos 450 MB.

## Si algo falla

El instalador para y te dice qué ha pasado y qué hacer. El mensaje termina con una línea «Registro: …»: si pides ayuda, adjunta ese archivo.

Si la tractografía quedó pendiente (por falta de memoria, de espacio o de red), NeuroGraph funciona sin ella. Cuando lo arregles, instálala con:

```
neurograph tractografia
```

Si ya estaba instalada y al repetir el instalador falta memoria o espacio, no se pierde: sigue instalada, y el instalador dice que no la repite.

## Conectar una IA

Si dijiste que no al instalar, o instalas una IA después:

```
neurograph conectar-ia
```

Las instrucciones para otras IAs están en `~/.local/share/neurograph/conectar-ia.md`. La IA solo ve NeuroGraph mientras está encendido.

## Desinstalar

```
neurograph desinstalar
```

Te pide confirmación (responde `s`). Quita NeuroGraph y conserva la base de datos y la biblioteca: si vuelves a instalar, los recuperas. Para borrar también la base de datos:

```
neurograph desinstalar --borrar-datos
```

En ese caso tendrás que escribir `BORRAR` para confirmarlo. La biblioteca nunca se borra sola: si no la quieres, bórrala a mano. Docker sigue instalado; si no lo usas para nada más, se quita aparte.

## Si ya usas el entorno de desarrollo

La instalación y el entorno de desarrollo tienen bases de datos distintas, que no se sincronizan. Los dos usan los puertos 5173 (la web) y 8420 (la API). Si están ocupados al instalar o al abrir NeuroGraph, este usa otros y lo dice. El entorno de desarrollo, en cambio, no cambia de puerto (`npm run dev` se para si el 5173 está ocupado): si NeuroGraph instalado está encendido, apágalo antes de arrancar el desarrollo.

---

# Instalar NeuroGraph en Windows

NeuroGraph se instala con un doble clic. El instalador prepara lo que haga falta (WSL2 y Docker Desktop, si no los tienes), carga los datos y comprueba que todo responde. Al terminar tendrás dos accesos en el menú Inicio: uno para abrir NeuroGraph en el navegador y otro para apagarlo.

## Qué necesitas

- **Windows 10 22H2 o Windows 11 23H2**, o posterior, en edición Pro, Enterprise o Education, de 64 bits y con procesador Intel o AMD. La edición Home no está en los requisitos de Docker Desktop: el instalador avisa y sigue, pero no se ha probado.
- **Memoria**: al menos 8 GB instalados, y 12 GB o más para la tractografía. Con 8 GB, la tractografía queda pendiente: Docker usa, por defecto, como mucho la mitad de la memoria, y 4 GB no le bastan.
- **La virtualización activada** en la configuración del firmware (BIOS o UEFI). Casi todos los ordenadores la traen activada; si no, el instalador te lo dice.
- **Espacio libre** en el disco C:
  - unos 15 GB si hay que instalar Docker Desktop, o unos 8 GB si ya lo tienes;
  - para la tractografía, 1,7 GB más y 1 GB en la carpeta de la biblioteca.

  En nuestras pruebas, la instalación completa gastó unos 13 GB. El instalador lo comprueba al empezar.
- **Conexión a internet.**
- **Permiso de administrador**, una vez, si hay que instalar WSL2 o Docker Desktop: lo pregunta Windows. En algún caso puede pedirlo una segunda vez, después de reiniciar; el instalador te lo dice.

No hace falta que lo compruebes tú: el instalador lo mira al empezar y te dice qué falta.

## Conseguir la carpeta de NeuroGraph

Descárgala como ZIP desde la página del proyecto en GitHub (botón «Code» > «Download ZIP»).

Antes de descomprimir el ZIP, desbloquéalo: haz clic derecho en él, elige «Propiedades» y, si abajo aparece la casilla «Desbloquear», márcala y pulsa «Aceptar». Windows marca lo que se descarga de internet, y esa marca pasa a los archivos que se descomprimen. No hemos comprobado qué aviso enseña Windows al abrir el instalador con la marca puesta: si te sale un aviso de seguridad al hacer doble clic en `instalar.cmd`, cancélalo, desbloquea el ZIP y descomprímelo otra vez. En un ordenador de una empresa o universidad, una directiva puede impedir ejecutar scripts descargados: el instalador lo detecta antes de empezar y te lo dice.

Descomprímelo en una carpeta de este ordenador, por ejemplo en Documentos: no en una unidad de red, y sin comas ni comillas en la ruta. El instalador también lo comprueba.

Si usas Git, clona el proyecto con `git clone --config core.autocrlf=false`: con los saltos de línea de Windows, la carga de datos fallaría (el instalador lo comprueba y te lo dice).

## Docker Desktop

NeuroGraph funciona dentro de Docker Desktop, que trae su propio Linux, interno y oculto: no se instala Ubuntu ni ninguna otra distribución. Docker Desktop es gratis para uso personal, educación, proyectos de código abierto no comerciales y empresas de menos de 250 empleados y menos de 10 millones de dólares de facturación al año; es de pago para las demás empresas y para la administración pública. El instalador te enseña estas condiciones y solo instala Docker Desktop si las aceptas.

## Instalar

Abre la carpeta de NeuroGraph, entra en `instalacion\windows` y haz doble clic en `instalar.cmd`. Se abre una ventana que va paso a paso (nueve en total) y marca cada uno con «OK» al terminarlo. Solo te pide algo cuando hace falta, y respondes escribiendo `s` o `n` y pulsando Intro:

- **dónde guardar la biblioteca de datos**, solo la primera vez. Te propone `%USERPROFILE%\NeuroData` (la carpeta `NeuroData` de tu cuenta) o una biblioteca de NeuroGraph que ya tengas, también en un disco externo. Si dices que no, se abre el selector de carpetas de Windows para que elijas otra carpeta o una unidad;
- **aceptar las condiciones de Docker Desktop**, si no lo tienes;
- **permiso de administrador**, si hay que instalar WSL2 o Docker Desktop. Lo pregunta Windows: pulsa «Sí» (el botón que viene marcado es «No»);
- **reiniciar Windows**, que hace falta para terminar de activar WSL2. Si contestas que sí, Windows se reinicia a los 15 segundos. Al volver a entrar en tu sesión, la ventana del instalador reaparece y sigue sola, sin volver a pedir permiso. Pueden abrirse también la ventana de bienvenida de WSL y la de Docker Desktop, que propone iniciar sesión: no hace falta hacer nada en ellas;
- **conectar NeuroGraph con las IAs de terminal** que encuentre (Claude Code, Codex CLI o Gemini CLI).

Al terminar, la ventana te dice cómo abrir NeuroGraph y espera a que pulses una tecla.

En nuestra máquina virtual de pruebas (Windows 11 con 12 GB) tardó unos 17 minutos desde cero, con la descarga de Docker Desktop, el reinicio y la tractografía. Repetirlo con todo ya instalado tardó un minuto y medio.

La biblioteca elegida se recuerda y no se vuelve a preguntar. Para cambiarla, abre la carpeta de NeuroGraph en el Explorador, escribe `cmd` en la barra de direcciones y pulsa Intro; en la ventana que se abre, escribe por ejemplo:

```
instalacion\windows\instalar.cmd --biblioteca D:\NeuroData
```

Si la biblioteca está en un disco externo y lo desconectas, NeuroGraph sigue funcionando: la tractografía ya cargada está en la base. Solo hace falta conectarlo para volver a instalarla. Si lo conectas con Docker Desktop abierto y NeuroGraph dice que no lo ve, reinicia Docker Desktop.

Si se corta (sin red, Ctrl+C, cerrando la ventana), vuelve a ejecutarlo: lo que ya estaba hecho se comprueba enseguida, y una base de datos ya cargada nunca se borra.

## Abrir y apagar

- **Abrir**: el acceso «NeuroGraph» del menú Inicio o, en una terminal, `neurograph abrir`. Si Docker Desktop está cerrado, lo abre; si NeuroGraph estaba apagado, lo enciende y abre el navegador. Mientras tanto no se abre ninguna ventana de consola: Windows enseña avisos («Encendiendo NeuroGraph…»).
- **Apagar**: el acceso «Apagar NeuroGraph» o `neurograph apagar`. Tus datos se conservan.
- **Ver cómo está**: `neurograph estado`.

La orden `neurograph` funciona en las ventanas de terminal que abras después de instalar. NeuroGraph no se enciende solo al iniciar Windows, y Docker Desktop tampoco, si lo instaló este instalador.

Apagar NeuroGraph no cierra Docker Desktop, que mientras está abierto ocupa memoria: en nuestra máquina de pruebas, con 12 GB y NeuroGraph encendido, unos 6 GB. Si no lo usas para otra cosa, puedes cerrarlo: el acceso «NeuroGraph» lo vuelve a abrir.

## Si algo falla

El instalador para y te dice qué ha pasado y qué hacer. El mensaje termina con una línea «Registro: …»: si pides ayuda, adjunta ese archivo. Desde los accesos del menú Inicio, un fallo sale en un cuadro de mensaje que te ofrece abrir el registro.

Si la tractografía quedó pendiente, NeuroGraph funciona sin ella. Si fue por la memoria de Docker, el mensaje dice cuánta darle y cómo (una línea `memory=…` en el archivo `.wslconfig` de tu carpeta de usuario, y reiniciar Docker Desktop), o que en ese ordenador no cabe. Cuando lo arregles, instálala con:

```
neurograph tractografia
```

Si ya estaba instalada y al repetir el instalador falta memoria o espacio, no se pierde: sigue instalada, y el instalador dice que no la repite.

## Conectar una IA

Si dijiste que no al instalar, o instalas una IA después:

```
neurograph conectar-ia
```

Las instrucciones para otras IAs están en `%LOCALAPPDATA%\neurograph-app\conectar-ia.md`. La IA solo ve NeuroGraph mientras está encendido: si lo enciendes con la IA ya abierta, vuelve a conectarla (en Claude Code, con `/mcp`).

## Desinstalar

```
neurograph desinstalar
```

Te pide confirmación (responde `s`). Quita NeuroGraph (sus contenedores e imágenes, los accesos, la orden `neurograph` y la conexión con las IAs) y conserva la base de datos, su configuración, la biblioteca y los registros: si vuelves a instalar, se recuperan. Para borrar también la base de datos:

```
neurograph desinstalar --borrar-datos
```

En ese caso tendrás que escribir `BORRAR` para confirmarlo. La biblioteca nunca se borra sola: si no la quieres, bórrala a mano.

Docker Desktop y WSL2 se quedan instalados: si no los usas para nada más, quítalos desde Configuración > Aplicaciones. El espacio que ocupaba NeuroGraph dentro de Docker no vuelve a Windows al desinstalar: el disco virtual de Docker no encoge solo.

## Si ya usas el entorno de desarrollo o la aplicación de escritorio

La instalación tiene su propia base de datos, que no se sincroniza con la del entorno de desarrollo ni con la de la aplicación de escritorio de NeuroGraph. Usa el puerto 8420 para la API, como ellos, y el 5173 para la web, como el desarrollo: si al instalar o al abrir NeuroGraph están ocupados, usa otros y lo dice. El entorno de desarrollo y la aplicación de escritorio, en cambio, no cambian de puerto: si NeuroGraph instalado está encendido, apágalo antes de arrancarlos.

## Qué no se ha probado todavía

El instalador se ha probado en una máquina virtual con Windows 11 Enterprise LTSC 24H2 y 12 GB: la instalación completa desde cero, repetirla, desinstalar y reinstalar, rechazar las condiciones de Docker Desktop, Docker con 4 GB y la conexión con Claude Code. No se ha probado todavía:

- Windows 10, ni un ordenador con 8 GB;
- Windows Terminal como programa de consola por defecto;
- una cuenta de Windows con espacios o tildes en el nombre;
- Codex CLI y Gemini CLI;
- qué aviso enseña Windows al abrir el instalador de un ZIP sin desbloquear;
- estos fallos: sin red, sin espacio, puertos ocupados, responder «No» al permiso de administrador, cortarlo a mitad (Ctrl+C o cerrando la ventana) y borrar los datos al desinstalar.
