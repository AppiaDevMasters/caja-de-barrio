# mcp-caja-de-barrio

Servidor MCP de Caja de Barrio (Open Payments Hackathon Medellín 2026 · AppiaDevMaster).

Es una **capa delgada**: cada herramienta llama un endpoint del backend en Go, que es dueño de la base y de las
integraciones externas (Open Payments, Didit, Verifik). El contrato está en
[`contexto-caja-de-barrio/contrato-backend.md`](https://github.com/AppiaDevMasters/contexto-caja-de-barrio/blob/main/contrato-backend.md) (sección 7).
Este servicio no guarda llaves de proveedores: solo `BACKEND_URL` y `SERVICIO_TOKEN`.

## Herramientas

| Herramienta | Endpoint del backend |
| --- | --- |
| `reservar_efectivo` | `POST /internal/caja/reservas` |
| `consultar_reserva` | `GET /internal/caja/reservas/{id}` |
| `reservas_de_tienda` | `GET /internal/caja/tiendas/{id}/reservas` |
| `cancelar_reserva` | `POST /internal/caja/reservas/{id}/cancelar` |
| `evaluar_riesgo` | `POST /internal/caja/reservas/{id}/riesgo` |
| `confirmar_entrega` | `POST /internal/caja/reservas/{id}/entrega-tendero` |
| `confirmar_recibido (interna)` | `POST /internal/caja/reservas/{id}/recibido-cliente` |

Las marcadas como internas no las ve el modelo: las llama el agente desde código (webhooks o después de leer
el mensaje real de la persona). Los errores del backend llegan al agente como `{"error": mensaje, "codigo": ...}`.

## Correr

```bash
uv sync
cp .env.example .env
uv run python -m servidor.main      # streamable HTTP en http://localhost:8103/mcp
uv run pytest
```

Para probar la cadena completa (agente + 4 MCP + backend simulado) usa `docker-compose.dev.yml` del repo
`agente-caja-de-barrio`.
