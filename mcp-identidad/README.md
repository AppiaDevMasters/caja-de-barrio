# mcp-identidad-caja-de-barrio

Servidor MCP de Caja de Barrio (Open Payments Hackathon Medellín 2026 · AppiaDevMaster).

Es una **capa delgada**: cada herramienta llama un endpoint del backend en Go, que es dueño de la base y de las
integraciones externas (Open Payments, Didit, Verifik). El contrato está en
[`contexto-caja-de-barrio/contrato-backend.md`](https://github.com/AppiaDevMasters/contexto-caja-de-barrio/blob/main/contrato-backend.md) (sección 5).
Este servicio no guarda llaves de proveedores: solo `BACKEND_URL` y `SERVICIO_TOKEN`.

## Herramientas

| Herramienta | Endpoint del backend |
| --- | --- |
| `consultar_persona` | `GET /internal/identidad/personas` |
| `aceptar_politicas (interna)` | `POST /internal/identidad/politicas/aceptaciones` |
| `verificar_cedula` | `POST /internal/identidad/cedulas/verificar` |
| `registrar_persona` | `POST /internal/identidad/personas` |
| `crear_sesion_facial` | `POST /internal/identidad/verificaciones` |
| `estado_verificacion` | `GET /internal/identidad/verificaciones/{session_id}` |
| `solicitar_ser_tendero` | `POST /internal/identidad/solicitudes-tendero` |
| `consultar_solicitud_tendero` | `GET /internal/identidad/solicitudes-tendero` |
| `corregir_solicitud_tendero` | `PUT /internal/identidad/solicitudes-tendero/{id}` |
| `procesar_webhook_didit (interna)` | `POST /internal/identidad/webhooks/didit` |

Las marcadas como internas no las ve el modelo: las llama el agente desde código (webhooks o después de leer
el mensaje real de la persona). Los errores del backend llegan al agente como `{"error": mensaje, "codigo": ...}`.

## Correr

```bash
uv sync
cp .env.example .env
uv run python -m servidor.main      # streamable HTTP en http://localhost:8104/mcp
uv run pytest
```

Para probar la cadena completa (agente + 4 MCP + backend simulado) usa `docker-compose.dev.yml` del repo
`agente-caja-de-barrio`.
