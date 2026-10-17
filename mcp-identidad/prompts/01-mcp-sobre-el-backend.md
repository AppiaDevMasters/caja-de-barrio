# 01 · Servidor MCP sobre el backend

Herramienta: Claude Code (Claude Opus 5.5). Fecha: 2026-10-16.

## Prompts (textuales)

> bien, recuerda que lo importante de  este proyecto será que ahora si los pagos se den, estamos esperando el backend

> mejor dejemos que el backend sea quien maneje los pagos, y nos conectamos a un endpoint del backend
>
> el mcp de pagos que sea quien consuma un endpoint del backend para hacer el pago

> dame un .md para que el backend lo haga y nos lo mande, entonces ya estaríamos preparado con eso

> sube a contexto ese .md para el backend

> comienza a armar todos los mcp
> y si, arma el contrato y subelo a contexto para que el back lo haga

Respuestas a las preguntas de diseño que hizo Claude:

> Datos MCP: Endpoints del backend (Recomendado)
>
> Identidad: El backend

## Resultado

Servidor FastMCP (streamable HTTP) con un cliente del backend que manda `X-Servicio-Token`, traduce los errores
del contrato y cubre la caída del backend; una herramienta por endpoint, con pruebas sobre un backend falso.
