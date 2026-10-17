# Conectar tu IA de terminal con NeuroGraph

NeuroGraph trae un conector MCP local: tu IA de terminal puede consultar los
datos del proyecto (regiones, conexiones, tractos, homologías, figuras) para
ayudarte con informes y artículos. El conector es el comando
`@NG_BIN@\neurograph-mcp.cmd`, y las IAs lo lanzan con `cmd.exe /c`.

**NeuroGraph tiene que estar encendido** (acceso «NeuroGraph» del menú Inicio
o `neurograph abrir`). Si está apagado, la IA lo verá como «no conectado»:
enciéndelo y vuelve a conectar (en Claude Code, con `/mcp`).

Escribe las órdenes de abajo en el Símbolo del sistema (cmd). En Windows
PowerShell, el `--` puede no llegar a la IA: escríbelo entre comillas, `'--'`.

## Claude Code

```
claude mcp remove neurograph -s user
claude mcp add --transport stdio --scope user neurograph -- cmd.exe /c "@NG_BIN@\neurograph-mcp.cmd"
claude mcp list
```

`remove` solo hace falta si ya estaba: `add` falla con un nombre repetido.
Usa Claude Code fuera de la carpeta del proyecto NeuroGraph: dentro, el
archivo `.mcp.json` del proyecto define otro «neurograph» que tapa a este.

## Codex CLI

```
codex mcp add neurograph -- cmd.exe /c "@NG_BIN@\neurograph-mcp.cmd"
codex mcp list
```

Codex espera 10 segundos a que el conector arranque. Si da un error de
tiempo, añade esta línea en `%USERPROFILE%\.codex\config.toml`, bajo
`[mcp_servers.neurograph]`:

```
startup_timeout_sec = 60
```

## Gemini CLI

```
gemini mcp add --scope user neurograph cmd.exe /c "@NG_BIN@\neurograph-mcp.cmd"
gemini mcp list
```

## Otros clientes (JSON genérico)

```json
{ "mcpServers": { "neurograph": { "command": "cmd.exe", "args": ["/c", "@NG_BIN_JSON@\\neurograph-mcp.cmd"] } } }
```

Para Codex, el equivalente en TOML (entre comillas simples, las barras no se escapan):

```toml
[mcp_servers.neurograph]
command = "cmd.exe"
args = ["/c", '@NG_BIN@\neurograph-mcp.cmd']
```

## Figuras como archivo

El conector entrega las figuras a la IA. Para tenerlas como archivo PNG,
con NeuroGraph encendido, se descargan de la API, por ejemplo:

```
curl.exe -o red.png "http://127.0.0.1:@NG_API_PUERTO@/render/network?atlas_id=atlas.human.hcp.mmp1_0"
```

En PowerShell hay que escribir `curl.exe`: `curl` a secas es otra orden.
El puerto de la API (@NG_API_PUERTO@ al instalar) puede cambiar si está
ocupado al abrir NeuroGraph: el de ahora lo dice `neurograph estado`.

Si el conector no funciona, `@NG_DIR@\registro\mcp.log` solo recoge los
mensajes del propio `neurograph-mcp.cmd` (por ejemplo, que NeuroGraph está
apagado); lo que escribe el servidor MCP lo recoge tu IA.
