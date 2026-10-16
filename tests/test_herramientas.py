"""Cada herramienta llama el endpoint del contrato (sección 8) con el cuerpo correcto."""

from servidor import main as m

LAURA = "$ilp.interledger-test.dev/laura-cajadebarrio"


async def test_resolver_wallet(falso):
    await m.resolver_wallet(LAURA)
    assert falso.ultimo.method == "GET" and falso.ultimo.url.path == "/internal/pagos/wallets"
    assert falso.ultimo.url.params["address"] == LAURA


async def test_cupo_y_continuar(falso):
    await m.pedir_cupo("per_laura", LAURA)
    assert falso.ultimo.url.path == "/internal/pagos/cupos"
    assert falso.cuerpo == {"persona_id": "per_laura", "wallet_cliente": LAURA}
    await m.continuar_permiso("gra_1", "ref", "h==")
    assert falso.ultimo.url.path == "/internal/pagos/cupos/gra_1/continuar"
    assert falso.cuerpo == {"interact_ref": "ref", "hash": "h=="}


async def test_cobro_cotizacion_y_aprobacion(falso):
    await m.crear_cobro("$ilp.interledger-test.dev/tienda-cajadebarrio", 200000, "res_1")
    assert falso.ultimo.url.path == "/internal/pagos/cobros" and falso.cuerpo["monto_cop"] == 200000
    await m.cotizar(LAURA, "https://ip/1", "res_1")
    assert falso.ultimo.url.path == "/internal/pagos/cotizaciones"
    assert falso.cuerpo == {"reserva_id": "res_1", "wallet_cliente": LAURA, "incoming_payment_url": "https://ip/1"}
    await m.registrar_aprobacion("res_1", "per_laura", "APROBAR", "whatsapp")
    assert falso.ultimo.url.path == "/internal/pagos/aprobaciones" and falso.cuerpo["texto_usuario"] == "APROBAR"


async def test_pagar_es_idempotente_por_reserva(falso):
    await m.pagar("res_1")
    assert falso.ultimo.method == "POST" and falso.ultimo.url.path == "/internal/pagos/pagos"
    assert falso.ultimo.headers["Idempotency-Key"] == "res_1"


async def test_pagar_sin_aprobacion_devuelve_el_error_del_backend(falso):
    falso.responder(409, {"error": {"codigo": "SIN_APROBACION", "mensaje": "La persona no ha escrito APROBAR."}})
    assert (await m.pagar("res_1"))["codigo"] == "SIN_APROBACION"


async def test_estado_cobro(falso):
    await m.estado_cobro("https://ip/1")
    assert falso.ultimo.url.path == "/internal/pagos/cobros/estado"
    assert falso.ultimo.url.params["url"] == "https://ip/1"
