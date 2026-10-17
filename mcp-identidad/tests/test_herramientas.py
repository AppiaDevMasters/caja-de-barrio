"""Cada herramienta llama el endpoint del contrato (sección 5) con el cuerpo correcto."""

from servidor import main as m


async def test_consultar_persona_y_politicas(falso):
    await m.consultar_persona("573000000001")
    assert falso.ultimo.method == "GET" and falso.ultimo.url.path == "/internal/identidad/personas"
    assert falso.ultimo.url.params["whatsapp"] == "573000000001"
    await m.aceptar_politicas("573000000001", "v1-2026-10", "Acepto")
    assert falso.ultimo.url.path == "/internal/identidad/politicas/aceptaciones"
    assert falso.cuerpo == {"whatsapp": "573000000001", "version": "v1-2026-10", "texto_usuario": "Acepto"}


async def test_cedula_y_registro(falso):
    await m.verificar_cedula("CC", "1036123456")
    assert falso.ultimo.url.path == "/internal/identidad/cedulas/verificar"
    await m.registrar_persona("573001112233", "CC", "1036123456", "$ilp.interledger-test.dev/x")
    assert falso.ultimo.url.path == "/internal/identidad/personas" and falso.ultimo.method == "POST"


async def test_verificacion_didit(falso):
    await m.crear_sesion_facial("per_laura", "retiro")
    assert falso.ultimo.url.path == "/internal/identidad/verificaciones"
    assert falso.cuerpo == {"persona_id": "per_laura", "motivo": "retiro"}
    await m.estado_verificacion("did_1")
    assert falso.ultimo.url.path == "/internal/identidad/verificaciones/did_1"


async def test_verificacion_de_persona_nueva_y_de_tendero_del_panel(falso):
    await m.crear_sesion_facial(motivo="alta", whatsapp="573001112233")
    assert falso.cuerpo == {"motivo": "alta", "whatsapp": "573001112233"}
    await m.crear_sesion_facial(motivo="alta_tendero", tienda_id="tie_1")
    assert falso.cuerpo == {"motivo": "alta_tendero", "tienda_id": "tie_1"}


async def test_verificacion_de_solicitud_de_tendero(falso):
    await m.crear_sesion_facial(motivo="alta_tendero", solicitud_id="sol_1")
    assert falso.cuerpo == {"motivo": "alta_tendero", "solicitud_id": "sol_1"}


async def test_solicitud_de_tendero(falso):
    await m.solicitar_ser_tendero("573001110020", "CC", "71234567", "Tienda Nueva", "Cra 50 #90-01",
                                  6.27, -75.55, "$ilp.interledger-test.dev/tienda-cajadebarrio", 500000)
    assert falso.ultimo.method == "POST" and falso.ultimo.url.path == "/internal/identidad/solicitudes-tendero"
    assert falso.cuerpo["nombre_tienda"] == "Tienda Nueva" and falso.cuerpo["lat"] == 6.27
    await m.consultar_solicitud_tendero("573001110020")
    assert falso.ultimo.method == "GET" and falso.ultimo.url.params["whatsapp"] == "573001110020"


async def test_corregir_solicitud_solo_manda_lo_que_cambia(falso):
    await m.corregir_solicitud_tendero("sol_1", lat=6.28, lon=-75.56)
    assert falso.ultimo.method == "PUT" and falso.ultimo.url.path == "/internal/identidad/solicitudes-tendero/sol_1"
    assert falso.cuerpo == {"lat": 6.28, "lon": -75.56}


async def test_webhook_didit_se_reenvia_sin_tocar(falso):
    cuerpo = '{"session_id":"x","status":"Approved"}'
    await m.procesar_webhook_didit(cuerpo, "firma123")
    assert falso.ultimo.url.path == "/internal/identidad/webhooks/didit"
    assert falso.cuerpo == {"cuerpo": cuerpo, "firma": "firma123"}
