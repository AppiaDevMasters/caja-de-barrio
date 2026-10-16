"""Servidor MCP de identidad de Caja de Barrio.

Capa delgada: cada herramienta llama un endpoint de identidad del backend Go, que integra Verifik
(cédula) y Didit (prueba de vida y face match) y guarda sus llaves.
Contrato: contexto-caja-de-barrio/contrato-backend.md (sección 5).
"""

from __future__ import annotations

import logging
from urllib.parse import quote

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from servidor.backend import get_settings, llamar

mcp = FastMCP(
    "mcp-identidad",
    instructions="Identidad en Caja de Barrio: quién escribe, políticas, registro y verificación con Didit.",
    host="0.0.0.0",
    port=get_settings().puerto,
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


@mcp.tool()
async def consultar_persona(whatsapp: str) -> dict:
    """Identifica quién escribe: persona que retira, tendero o alguien no registrado.

    Args:
        whatsapp: Número de WhatsApp con indicativo, solo dígitos (ej. 573001234567).
    """
    return await llamar("GET", "/identidad/personas", params={"whatsapp": whatsapp})


@mcp.tool()
async def aceptar_politicas(whatsapp: str, version: str, texto_usuario: str) -> dict:
    """INTERNA: guarda que la persona aceptó las políticas (lo llama el agente con su mensaje real)."""
    return await llamar("POST", "/identidad/politicas/aceptaciones",
                        json={"whatsapp": whatsapp, "version": version, "texto_usuario": texto_usuario})


@mcp.tool()
async def verificar_cedula(tipo: str, numero: str) -> dict:
    """Valida una cédula colombiana (CC) o un PPT con Verifik.

    Args:
        tipo: "CC" o "PPT".
        numero: Número del documento, solo dígitos.
    """
    return await llamar("POST", "/identidad/cedulas/verificar", json={"tipo": tipo, "numero": numero})


@mcp.tool()
async def registrar_persona(whatsapp: str, tipo: str, numero: str, wallet_address: str) -> dict:
    """Crea el registro de una persona nueva después de validar su cédula.

    Args:
        whatsapp: Número de WhatsApp de la persona.
        tipo: "CC" o "PPT".
        numero: Número del documento.
        wallet_address: Billetera de Open Payments desde la que pagará.
    """
    return await llamar("POST", "/identidad/personas",
                        json={"whatsapp": whatsapp, "tipo": tipo, "numero": numero, "wallet_address": wallet_address})


@mcp.tool()
async def crear_sesion_facial(persona_id: str = "", motivo: str = "retiro", solicitud_id: str = "") -> dict:
    """Crea la sesión de prueba de vida y face match en Didit. Es el primer paso de toda operación.

    Args:
        persona_id: Id de la persona a verificar (clientes).
        motivo: "alta" (registro), "retiro" (inicio de un retiro) o "alta_tendero" (solicitud de tienda).
        solicitud_id: Id de la solicitud de tendero, en lugar de persona_id, cuando el motivo es "alta_tendero".
    """
    cuerpo = {"motivo": motivo}
    if solicitud_id:
        cuerpo["solicitud_id"] = solicitud_id
    else:
        cuerpo["persona_id"] = persona_id
    return await llamar("POST", "/identidad/verificaciones", json=cuerpo)


@mcp.tool()
async def solicitar_ser_tendero(whatsapp: str, tipo: str, numero: str, nombre_tienda: str, direccion: str,
                                lat: float, lon: float, wallet_address: str, efectivo_estimado_cop: int) -> dict:
    """Crea la solicitud de alguien que quiere registrar su tienda como punto de retiro.

    Después hay que verificar su identidad con crear_sesion_facial(solicitud_id=..., motivo="alta_tendero").
    La solicitud queda en revisión del equipo de Caja de Barrio, que la aprueba o rechaza desde el panel.

    Args:
        whatsapp: Número de WhatsApp de quien solicita.
        tipo: "CC" o "PPT".
        numero: Número del documento.
        nombre_tienda: Nombre de la tienda.
        direccion: Dirección de la tienda.
        lat: Latitud de la tienda (del pin de ubicación).
        lon: Longitud de la tienda (del pin de ubicación).
        wallet_address: Billetera de Open Payments de la tienda (en pesos).
        efectivo_estimado_cop: Cuánto efectivo maneja la tienda al día, en pesos.
    """
    return await llamar("POST", "/identidad/solicitudes-tendero", json={
        "whatsapp": whatsapp, "tipo": tipo, "numero": numero, "nombre_tienda": nombre_tienda, "direccion": direccion,
        "lat": lat, "lon": lon, "wallet_address": wallet_address, "efectivo_estimado_cop": efectivo_estimado_cop})


@mcp.tool()
async def consultar_solicitud_tendero(whatsapp: str) -> dict:
    """Estado de la solicitud de tienda de ese WhatsApp (la más reciente).

    Args:
        whatsapp: Número de WhatsApp de quien solicitó.
    """
    return await llamar("GET", "/identidad/solicitudes-tendero", params={"whatsapp": whatsapp})


@mcp.tool()
async def corregir_solicitud_tendero(solicitud_id: str, direccion: str = "", lat: float | None = None,
                                     lon: float | None = None, wallet_address: str = "", tipo: str = "",
                                     numero: str = "") -> dict:
    """Corrige los datos que el equipo pidió corregir; la solicitud vuelve a revisión.

    Args:
        solicitud_id: Id de la solicitud.
        direccion: Nueva dirección (si se pidió corregir la ubicación).
        lat: Nueva latitud.
        lon: Nueva longitud.
        wallet_address: Nueva billetera (si se pidió corregir la wallet).
        tipo: Nuevo tipo de documento (si se pidió corregir el documento).
        numero: Nuevo número de documento.
    """
    cambios = {"direccion": direccion, "lat": lat, "lon": lon, "wallet_address": wallet_address,
               "tipo": tipo, "numero": numero}
    return await llamar("PUT", f"/identidad/solicitudes-tendero/{quote(solicitud_id, safe='')}",
                        json={k: v for k, v in cambios.items() if v not in ("", None)})


@mcp.tool()
async def estado_verificacion(session_id: str) -> dict:
    """Consulta el resultado de una sesión de verificación facial.

    Args:
        session_id: Id de la sesión devuelto por crear_sesion_facial.
    """
    return await llamar("GET", f"/identidad/verificaciones/{quote(session_id, safe='')}")


@mcp.tool()
async def procesar_webhook_didit(cuerpo: str, firma: str) -> dict:
    """INTERNA (gateway /webhook/didit): reenvía al backend el webhook de Didit sin tocarlo para que lo valide."""
    return await llamar("POST", "/identidad/webhooks/didit", json={"cuerpo": cuerpo, "firma": firma})


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
