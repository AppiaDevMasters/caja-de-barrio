"""Cada herramienta llama el endpoint del contrato (sección 6) con el cuerpo correcto."""

from servidor import main as m


async def test_buscar_cajas_cercanas(falso):
    await m.buscar_cajas_cercanas(6.2766, -75.5583, 200000)
    assert falso.ultimo.method == "GET" and falso.ultimo.url.path == "/internal/mapa/tiendas/cercanas"
    assert dict(falso.ultimo.url.params) == {"lat": "6.2766", "lon": "-75.5583", "monto_cop": "200000",
                                             "radio_m": "1500"}


async def test_detalle_y_publicar(falso):
    await m.detalle_tienda("tie_jaime")
    assert falso.ultimo.url.path == "/internal/mapa/tiendas/tie_jaime"
    await m.publicar_efectivo("tie_jaime", 900000)
    assert falso.ultimo.method == "PUT" and falso.ultimo.url.path == "/internal/mapa/tiendas/tie_jaime/efectivo"
    assert falso.cuerpo == {"monto_cop": 900000}
