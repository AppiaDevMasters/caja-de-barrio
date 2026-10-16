"""Servidor MCP de pagos de Caja de Barrio.

Capa delgada: cada herramienta llama un endpoint de pagos del backend Go, que es quien habla con
Open Payments y guarda las llaves. Contrato: contexto-caja-de-barrio/contrato-backend.md (sección 8).
"""

from __future__ import annotations

import logging
from urllib.parse import quote

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from servidor.backend import get_settings, llamar

mcp = FastMCP(
    "mcp-pagos",
    instructions="Pagos de Caja de Barrio con Open Payments: cupo, cobros, cotización, aprobación y pago.",
    host="0.0.0.0",
    port=get_settings().puerto,
    stateless_http=True,
    json_response=True,
    # Corre dentro de la red de Docker y se llama por nombre de servicio (mcp-pagos:8101).
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


@mcp.tool()
async def resolver_wallet(wallet_address: str) -> dict:
    """Resuelve una wallet address de Open Payments.

    Args:
        wallet_address: Dirección tipo $ilp.interledger-test.dev/nombre.
    """
    return await llamar("GET", "/pagos/wallets", params={"address": wallet_address})


@mcp.tool()
async def pedir_cupo(persona_id: str, wallet_cliente: str) -> dict:
    """Pide UNA vez el permiso de la persona en su billetera para un cupo de pagos con tope semanal.

    Devuelve el link para que la persona apruebe el cupo en su billetera. Los retiros siguientes
    se aprueban en el chat y se pagan contra este cupo.

    Args:
        persona_id: Id de la persona.
        wallet_cliente: Wallet address desde la que pagará.
    """
    return await llamar("POST", "/pagos/cupos", json={"persona_id": persona_id, "wallet_cliente": wallet_cliente})


@mcp.tool()
async def continuar_permiso(grant_id: str, interact_ref: str, hash: str = "") -> dict:
    """INTERNA (gateway /op/finish): continúa el permiso del cupo cuando la persona vuelve de su billetera."""
    return await llamar("POST", f"/pagos/cupos/{quote(grant_id, safe='')}/continuar",
                        json={"interact_ref": interact_ref, "hash": hash})


@mcp.tool()
async def crear_cobro(wallet_tienda: str, monto_cop: int, reserva_id: str) -> dict:
    """Crea los cobros del retiro: el de la tienda (retiro + su comisión) y el 1% de Caja de Barrio.

    Args:
        wallet_tienda: Wallet address de la tienda.
        monto_cop: Monto del retiro en pesos (sin comisiones; se suman solas).
        reserva_id: Reserva asociada.
    """
    return await llamar("POST", "/pagos/cobros",
                        json={"reserva_id": reserva_id, "wallet_tienda": wallet_tienda, "monto_cop": monto_cop})


@mcp.tool()
async def cotizar(wallet_cliente: str, incoming_payment_url: str, reserva_id: str = "") -> dict:
    """Cotiza cuánto se debita de la billetera de quien paga, con el desglose de comisiones.

    Args:
        wallet_cliente: Wallet address de quien paga.
        incoming_payment_url: Cobro de la tienda creado con crear_cobro.
        reserva_id: Reserva asociada (si se conoce).
    """
    return await llamar("POST", "/pagos/cotizaciones",
                        json={"reserva_id": reserva_id or None, "wallet_cliente": wallet_cliente,
                              "incoming_payment_url": incoming_payment_url})


@mcp.tool()
async def registrar_aprobacion(reserva_id: str, persona_id: str, texto_usuario: str, canal: str) -> dict:
    """INTERNA: guarda en base la aprobación del pago que la persona escribió en el chat."""
    return await llamar("POST", "/pagos/aprobaciones",
                        json={"reserva_id": reserva_id, "persona_id": persona_id,
                              "texto_usuario": texto_usuario, "canal": canal})


@mcp.tool()
async def pagar(reserva_id: str) -> dict:
    """Ejecuta los pagos (tienda y Caja de Barrio) contra el cupo aprobado.

    Exige: identidad verificada, riesgo permitido, aprobación escrita en el chat y cupo suficiente.

    Args:
        reserva_id: Id de la reserva.
    """
    return await llamar("POST", "/pagos/pagos", json={"reserva_id": reserva_id},
                        headers={"Idempotency-Key": reserva_id})


@mcp.tool()
async def estado_cobro(incoming_payment_url: str) -> dict:
    """Consulta si el cobro de la tienda ya quedó completado.

    Args:
        incoming_payment_url: Cobro creado con crear_cobro.
    """
    return await llamar("GET", "/pagos/cobros/estado", params={"url": incoming_payment_url})


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
