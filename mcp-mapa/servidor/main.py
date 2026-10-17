"""Servidor MCP de ubicación de Caja de Barrio.

Capa delgada: cada herramienta llama un endpoint de mapa del backend Go, que hace las consultas en
PostGIS. Contrato: contexto-caja-de-barrio/contrato-backend.md (sección 6).
"""

from __future__ import annotations

import logging
from urllib.parse import quote

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from servidor.backend import get_settings, llamar

mcp = FastMCP(
    "mcp-mapa",
    instructions="Tiendas de Caja de Barrio: búsqueda de tiendas cercanas con efectivo y su comisión.",
    host="0.0.0.0",
    port=get_settings().puerto,
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


@mcp.tool()
async def buscar_cajas_cercanas(lat: float, lon: float, monto_cop: int, radio_m: int = 1500) -> dict:
    """Encuentra hasta 3 tiendas cercanas con efectivo libre suficiente, con su comisión calculada.

    Args:
        lat: Latitud de la persona.
        lon: Longitud de la persona.
        monto_cop: Monto a retirar en pesos colombianos (entero).
        radio_m: Radio de búsqueda en metros.
    """
    return await llamar("GET", "/mapa/tiendas/cercanas",
                        params={"lat": lat, "lon": lon, "monto_cop": monto_cop, "radio_m": radio_m})


@mcp.tool()
async def detalle_tienda(tienda_id: str) -> dict:
    """Devuelve los datos de la tienda para enviar el pin por WhatsApp.

    Args:
        tienda_id: Id de la tienda.
    """
    return await llamar("GET", f"/mapa/tiendas/{quote(tienda_id, safe='')}")


@mcp.tool()
async def publicar_efectivo(tienda_id: str, monto_cop: int) -> dict:
    """El tendero publica cuánto efectivo tiene disponible hoy.

    Args:
        tienda_id: Id de la tienda.
        monto_cop: Efectivo total disponible para retiros, en pesos.
    """
    return await llamar("PUT", f"/mapa/tiendas/{quote(tienda_id, safe='')}/efectivo", json={"monto_cop": monto_cop})


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
