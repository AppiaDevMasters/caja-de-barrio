"""Backend falso: registra lo que piden las herramientas y responde lo que diga cada prueba."""

import json

import httpx
import pytest

from servidor import backend


class BackendFalso:
    def __init__(self):
        self.pedidos: list[httpx.Request] = []
        self.respuesta = httpx.Response(200, json={"ok": True})

    def responder(self, status: int, cuerpo):
        self.respuesta = httpx.Response(status, json=cuerpo)

    @property
    def ultimo(self) -> httpx.Request:
        return self.pedidos[-1]

    @property
    def cuerpo(self) -> dict:
        return json.loads(self.ultimo.content or b"{}")

    def _manejar(self, request: httpx.Request) -> httpx.Response:
        self.pedidos.append(request)
        return self.respuesta


@pytest.fixture
def falso(monkeypatch):
    f = BackendFalso()
    monkeypatch.setattr(backend, "fabrica_cliente", lambda: httpx.AsyncClient(
        base_url="http://backend/internal", headers={"X-Servicio-Token": "tok"},
        transport=httpx.MockTransport(f._manejar)))
    return f
