"""Cliente del backend Go. Todas las herramientas pasan por aquí.

Contrato: contexto-caja-de-barrio/contrato-backend.md. Los errores del backend llegan como
{"error": {"codigo", "mensaje"}} y se le devuelven al agente como {"error": mensaje, "codigo": codigo},
que es la forma que el agente ya sabe explicarle a la persona.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Callable

import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    backend_url: str = "http://backend:8090/internal"
    servicio_token: str = ""
    puerto: int = 8000
    timeout_s: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


def _cliente_por_defecto() -> httpx.AsyncClient:
    s = get_settings()
    return httpx.AsyncClient(base_url=s.backend_url.rstrip("/"), timeout=s.timeout_s,
                             headers={"X-Servicio-Token": s.servicio_token})


# Las pruebas lo reemplazan por un cliente con transporte simulado.
fabrica_cliente: Callable[[], httpx.AsyncClient] = _cliente_por_defecto


async def llamar(metodo: str, ruta: str, *, params: dict | None = None, json: dict | None = None,
                 headers: dict | None = None) -> dict[str, Any]:
    params = {k: v for k, v in (params or {}).items() if v is not None}
    try:
        async with fabrica_cliente() as cliente:
            r = await cliente.request(metodo, ruta, params=params, json=json, headers=headers)
    except httpx.HTTPError as e:
        log.error("backend inalcanzable %s %s: %s", metodo, ruta, e)
        return {"error": "No pude comunicarme con el sistema. Intenta de nuevo en un momento.",
                "codigo": "BACKEND_INALCANZABLE"}
    try:
        cuerpo = r.json()
    except ValueError:
        cuerpo = {}
    if r.is_success:
        return cuerpo if isinstance(cuerpo, dict) else {"resultado": cuerpo}
    err = cuerpo.get("error") if isinstance(cuerpo, dict) else None
    if isinstance(err, dict):
        mensaje, codigo = err.get("mensaje") or "Error del sistema.", err.get("codigo") or f"HTTP_{r.status_code}"
    else:
        mensaje, codigo = (err or f"Error del sistema ({r.status_code})."), f"HTTP_{r.status_code}"
    log.warning("backend %s %s -> %s %s", metodo, ruta, r.status_code, codigo)
    return {"error": mensaje, "codigo": codigo}
