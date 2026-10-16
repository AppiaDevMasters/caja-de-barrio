# mcp-mapa-caja-de-barrio

Servidor MCP de Caja de Barrio (Open Payments Hackathon Medellín 2026 · AppiaDevMaster).

Es una **capa delgada**: cada herramienta llama un endpoint del backend en Go, que es dueño de la base y de las
integraciones externas (Open Payments, Didit, Verifik). El contrato está en
[`contexto-caja-de-barrio/contrato-backend.md`](https://github.com/AppiaDevMasters/contexto-caja-de-barrio/blob/main/contrato-backend.md) (sección 6).
Este servicio no guarda llaves de proveedores: solo `BACKEND_URL` y `SERVICIO_TOKEN`.

## Herramientas

| Herramienta | Endpoint del backend |
| --- | --- |
| `buscar_cajas_cercanas` | `GET /internal/mapa/tiendas/cercanas` |
| `detalle_tienda` | `GET /internal/mapa/tiendas/{id}` |
| `publicar_efectivo` | `PUT /internal/mapa/tiendas/{id}/efectivo` |

Las marcadas como internas no las ve el modelo: las llama el agente desde código (webhooks o después de leer
el mensaje real de la persona). Los errores del backend llegan al agente como `{"error": mensaje, "codigo": ...}`.

## Correr

```bash
uv sync
cp .env.example .env
uv run python -m servidor.main      # streamable HTTP en http://localhost:8102/mcp
uv run pytest
```

Para probar la cadena completa (agente + 4 MCP + backend simulado) usa `docker-compose.dev.yml` del repo
`agente-caja-de-barrio`.
