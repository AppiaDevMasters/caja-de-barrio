"""Cada herramienta llama el endpoint del contrato (sección 7) con el cuerpo correcto."""

from servidor import main as m


async def test_reservar_y_consultar(falso):
    await m.reservar_efectivo("tie_jaime", "per_laura", 200000)
    assert falso.ultimo.method == "POST" and falso.ultimo.url.path == "/internal/caja/reservas"
    assert falso.cuerpo == {"tienda_id": "tie_jaime", "persona_id": "per_laura", "monto_cop": 200000}
    await m.consultar_reserva("res_1")
    assert falso.ultimo.method == "GET" and falso.ultimo.url.path == "/internal/caja/reservas/res_1"
    await m.reservas_de_tienda("tie_jaime")
    assert falso.ultimo.url.path == "/internal/caja/tiendas/tie_jaime/reservas"


async def test_cancelar_y_riesgo(falso):
    await m.cancelar_reserva("res_1", "verificación facial rechazada")
    assert falso.ultimo.url.path == "/internal/caja/reservas/res_1/cancelar"
    assert falso.cuerpo == {"motivo": "verificación facial rechazada"}
    await m.evaluar_riesgo("per_laura", 200000, "573000000001", "res_1")
    assert falso.ultimo.url.path == "/internal/caja/reservas/res_1/riesgo"
    assert falso.cuerpo == {"persona_id": "per_laura", "monto_cop": 200000, "dispositivo": "573000000001"}


async def test_doble_confirmacion_de_entrega(falso):
    await m.confirmar_entrega("res_1", "6565")
    assert falso.ultimo.url.path == "/internal/caja/reservas/res_1/entrega-tendero"
    assert falso.cuerpo == {"codigo": "6565"}
    await m.confirmar_recibido("res_1", False, "no me dieron nada")
    assert falso.ultimo.url.path == "/internal/caja/reservas/res_1/recibido-cliente"
    assert falso.cuerpo == {"recibido": False, "texto_usuario": "no me dieron nada"}


async def test_ids_raros_no_rompen_la_ruta(falso):
    await m.consultar_reserva("../tiendas")
    assert falso.ultimo.url.raw_path == b"/internal/caja/reservas/..%2Ftiendas"
