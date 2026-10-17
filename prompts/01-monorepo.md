# 01 · Un solo repositorio

Herramienta: Claude Code (Claude Opus 5.5). Fecha: 2026-10-17.

## Prompt (textual)

> necesito que me justes todos los repos menos el de contexto en un mismo repo y lo subas a la misma organización

## Resultado

- **Siete repos en carpetas, con su historial** (`git subtree add`): `agente`, `mcp-identidad`, `mcp-mapa`, `mcp-caja`,
  `mcp-pagos`, `backend` y `frontend`.
- **El backend entra desde la rama `feat/modo-testnet`**: es la desplegada y probada de punta a punta, con el modo
  testnet y los arreglos del cupo.
- **El resto entra desde `main`**; el frontend, con lo último de GitHub.
- **Los repos de origen quedan como estaban.**
- **No entra ningún secreto:** las llaves viven solo en el servidor (`deploy/llaves.env`, `rafiki/.env`, `keys/`), que
  ningún repo versiona.
