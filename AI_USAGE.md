# Uso de IA

Este repositorio junta los repos del equipo. **Cada carpeta tiene su propio `AI_USAGE.md` y su `prompts/`**, con el
detalle de qué herramienta escribió qué y los prompts textuales:

| Carpeta | Uso de IA | Prompts |
|---|---|---|
| `agente/` | [`agente/AI_USAGE.md`](agente/AI_USAGE.md) | [`agente/prompts/`](agente/prompts/) |
| `mcp-identidad/` | [`mcp-identidad/AI_USAGE.md`](mcp-identidad/AI_USAGE.md) | [`mcp-identidad/prompts/`](mcp-identidad/prompts/) |
| `mcp-mapa/` | [`mcp-mapa/AI_USAGE.md`](mcp-mapa/AI_USAGE.md) | [`mcp-mapa/prompts/`](mcp-mapa/prompts/) |
| `mcp-caja/` | [`mcp-caja/AI_USAGE.md`](mcp-caja/AI_USAGE.md) | [`mcp-caja/prompts/`](mcp-caja/prompts/) |
| `mcp-pagos/` | [`mcp-pagos/AI_USAGE.md`](mcp-pagos/AI_USAGE.md) | [`mcp-pagos/prompts/`](mcp-pagos/prompts/) |
| `backend/` | [`backend/AI_USAGE.md`](backend/AI_USAGE.md) | [`backend/prompts/`](backend/prompts/) |
| `frontend/` | [`frontend/AI_USAGE.md`](frontend/AI_USAGE.md) | [`frontend/prompts/`](frontend/prompts/) |

## Este repositorio

| Herramienta | Para qué | Archivos |
|---|---|---|
| Claude Code (Claude Opus 5.5) | Juntar los siete repos en uno con `git subtree` (conservando el historial de cada uno) y escribir este `README.md`, este `AI_USAGE.md` y `prompts/`. | `README.md`, `AI_USAGE.md`, `prompts/` |

El prompt textual está en [`prompts/01-monorepo.md`](prompts/01-monorepo.md).
