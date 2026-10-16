"""Servidor MCP de reservas y riesgo de Caja de Barrio.

Capa delgada: cada herramienta llama un endpoint de caja del backend Go, que guarda las reservas y
aplica las reglas (comisiones, topes, pitufeo, doble confirmación de entrega).
Contrato: contexto-caja-de-barrio/contrato-backend.md (sección 7).
"""

from __future__ import annotations

import logging
from urllib.parse import quote

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from servidor.backend import get_settings, llamar

mcp = FastMCP(
    "mcp-caja",
    instructions="Reservas de efectivo de Caja de Barrio: reservar, riesgo, cancelación y confirmaciones de entrega.",
    host="0.0.0.0",
    port=get_settings().puerto,
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


def _reserva(reserva_id: str) -> str:
    return f"/caja/reservas/{quote(reserva_id, safe='')}"


@mcp.tool()
async def reservar_efectivo(tienda_id: str, persona_id: str, monto_cop: int) -> dict:
    """Aparta el efectivo en la tienda, calcula las comisiones y genera el código de 4 dígitos.

    Exige políticas aceptadas e identidad verificada en Didit hace menos de 30 minutos.

    Args:
        tienda_id: Id de la tienda elegida.
        persona_id: Id de la persona que retira.
        monto_cop: Monto en pesos (entero).
    """
    return await llamar("POST", "/caja/reservas",
                        json={"tienda_id": tienda_id, "persona_id": persona_id, "monto_cop": monto_cop})


@mcp.tool()
async def consultar_reserva(reserva_id: str) -> dict:
    """Estado de una reserva, sus comisiones y qué pasos del retiro ya se completaron.

    Args:
        reserva_id: Id de la reserva.
    """
    return await llamar("GET", _reserva(reserva_id))


@mcp.tool()
async def reservas_de_tienda(tienda_id: str) -> dict:
    """Retiros activos de una tienda, para que el tendero sepa a quién espera.

    Args:
        tienda_id: Id de la tienda.
    """
    return await llamar("GET", f"/caja/tiendas/{quote(tienda_id, safe='')}/reservas")


@mcp.tool()
async def cancelar_reserva(reserva_id: str, motivo: str) -> dict:
    """Cancela una reserva y libera el efectivo apartado.

    Args:
        reserva_id: Id de la reserva.
        motivo: Por qué se cancela.
    """
    return await llamar("POST", f"{_reserva(reserva_id)}/cancelar", json={"motivo": motivo})


@mcp.tool()
async def evaluar_riesgo(persona_id: str, monto_cop: int, dispositivo: str, reserva_id: str) -> dict:
    """Aplica topes por nivel y la regla de pitufeo. Puede bloquear a la persona.

    Args:
        persona_id: Id de la persona.
        monto_cop: Monto del retiro en pesos.
        dispositivo: Identificador del canal o dispositivo (ej. número de WhatsApp).
        reserva_id: Reserva que se está evaluando.
    """
    return await llamar("POST", f"{_reserva(reserva_id)}/riesgo",
                        json={"persona_id": persona_id, "monto_cop": monto_cop, "dispositivo": dispositivo})


@mcp.tool()
async def confirmar_entrega(reserva_id: str, codigo: str) -> dict:
    """El TENDERO confirma que entregó los billetes, con el código de 4 dígitos de la persona.

    Solo funciona si la reserva está pagada y el cobro completado. La entrega queda cerrada
    cuando también la persona confirma que recibió.

    Args:
        reserva_id: Id de la reserva.
        codigo: Código de 4 dígitos que muestra la persona.
    """
    return await llamar("POST", f"{_reserva(reserva_id)}/entrega-tendero", json={"codigo": codigo})


@mcp.tool()
async def confirmar_recibido(reserva_id: str, recibido: bool, texto_usuario: str) -> dict:
    """INTERNA: la PERSONA confirma (o niega) que recibió los billetes. Si lo niega, se abre disputa."""
    return await llamar("POST", f"{_reserva(reserva_id)}/recibido-cliente",
                        json={"recibido": recibido, "texto_usuario": texto_usuario})


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
