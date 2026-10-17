# Conectar tu IA de terminal con NeuroGraph

NeuroGraph trae un conector MCP local: tu IA de terminal puede consultar los
datos del proyecto (regiones, conexiones, tractos, homologías, figuras) para
ayudarte con informes y artículos. El conector es el comando
`@NG_BIN@/neurograph-mcp`.

**NeuroGraph tiene que estar encendido** (icono «NeuroGraph» o `neurograph
abrir`). Si está apagado, la IA lo verá como «no conectado»: enciéndelo y
vuelve a conectar (en Claude Code, con `/mcp`).

## Claude Code

```
claude mcp remove neurograph -s user   # solo si ya estaba: add falla con un nombre repetido
claude mcp add --transport stdio --scope user neurograph -- @NG_BIN@/neurograph-mcp
claude mcp list
```

Usa Claude Code fuera de la carpeta del proyecto NeuroGraph: dentro, el
archivo `.mcp.json` del proyecto define otro «neurograph» que tapa a este.

## Codex CLI

```
codex mcp add neurograph -- @NG_BIN@/neurograph-mcp
codex mcp list
```

Codex espera 10 segundos a que el conector arranque. Si da un error de
tiempo, añade esta línea en `~/.codex/config.toml`, bajo
`[mcp_servers.neurograph]`:

```
startup_timeout_sec = 60
```

## Gemini CLI

```
gemini mcp add --scope user neurograph @NG_BIN@/neurograph-mcp
gemini mcp list
```

## Otros clientes (JSON genérico)

```json
{ "mcpServers": { "neurograph": { "command": "@NG_BIN@/neurograph-mcp", "args": [] } } }
```

Para Codex, el equivalente en TOML:

```toml
[mcp_servers.neurograph]
command = "@NG_BIN@/neurograph-mcp"
```

## Figuras como archivo

El conector entrega las figuras a la IA. Para tenerlas como archivo PNG,
con NeuroGraph encendido, se descargan de la API, por ejemplo:

```
curl -o red.png "http://127.0.0.1:@NG_API_PUERTO@/render/network?atlas_id=atlas.human.hcp.mmp1_0"
```

El puerto de la API (@NG_API_PUERTO@ al instalar) puede cambiar si está
ocupado al abrir NeuroGraph: el de ahora lo dice `neurograph estado`.

Si el conector no funciona, `@NG_DIR@/registro/mcp.log` solo recoge los
mensajes del propio comando `neurograph-mcp` (por ejemplo, que NeuroGraph
está apagado); lo que escribe el servidor MCP lo recoge tu IA.
