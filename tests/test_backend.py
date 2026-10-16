"""Cliente del backend: token, mapeo de errores y caída del backend."""

import httpx

from servidor import backend


async def test_manda_el_token_y_devuelve_el_json(falso):
    falso.responder(200, {"hola": 1})
    assert await backend.llamar("GET", "/x", params={"a": 1, "b": None}) == {"hola": 1}
    assert falso.ultimo.headers["X-Servicio-Token"] == "tok"
    assert str(falso.ultimo.url) == "http://backend/internal/x?a=1"


async def test_errores_del_contrato_llegan_al_agente_en_espanol(falso):
    falso.responder(409, {"error": {"codigo": "SIN_VERIFICACION", "mensaje": "Primero hay que verificar la identidad."}})
    assert await backend.llamar("POST", "/x", json={}) == {
        "error": "Primero hay que verificar la identidad.", "codigo": "SIN_VERIFICACION"}


async def test_backend_caido(monkeypatch):
    def caido(request):
        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(backend, "fabrica_cliente",
                        lambda: httpx.AsyncClient(base_url="http://b", transport=httpx.MockTransport(caido)))
    r = await backend.llamar("GET", "/x")
    assert r["codigo"] == "BACKEND_INALCANZABLE" and "error" in r
