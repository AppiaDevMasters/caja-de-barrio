# Caja de Barrio

**Las tiendas del barrio como cajeros.** La persona retira efectivo en la tienda de la esquina y lo paga con
**Open Payments**. Un agente conversacional acompaña a las dos partes, cliente y tendero, por WhatsApp o por la UI de
ADK. Open Payments Hackathon, Ruta N, Medellín, 16 y 17 de octubre de 2026.

Este repositorio reúne en uno los repos del equipo, **con su historial** (`git subtree`):

| Carpeta | Qué es | Repo de origen |
|---|---|---|
| [`agente/`](agente/) | Agente en Google ADK 2.5 (Gemini): coordinador y especialistas de identidad, ubicación, riesgo y pagos; gateway de WhatsApp, Didit y Open Payments | `agente-caja-de-barrio` |
| [`mcp-identidad/`](mcp-identidad/) | MCP de identidad: quién escribe, políticas, Didit y Verifik | `mcp-identidad-caja-de-barrio` |
| [`mcp-mapa/`](mcp-mapa/) | MCP del mapa: tiendas cercanas con su comisión y efectivo del día | `mcp-mapa-caja-de-barrio` |
| [`mcp-caja/`](mcp-caja/) | MCP de la caja: reserva, riesgo, entrega con código y doble confirmación | `mcp-caja-de-barrio` |
| [`mcp-pagos/`](mcp-pagos/) | MCP de pagos: cupo (grant interactivo), cobros, cotización, APROBAR, pago y saldo | `mcp-pagos-caja-de-barrio` |
| [`backend/`](backend/) | Backend en Go: proveedor de billeteras (ASE) con Rafiki propio, cliente de Open Payments, Didit, Verifik, `/internal` para los MCP y `/admin` para el panel | `backend-caja-de-barrio` (rama `feat/modo-testnet`) |
| [`frontend/`](frontend/) | Panel de control en React | `frontend-caja-de-barrio` |

## Las 5 reglas de oro

1. El agente habla con **ambas partes**: cliente y tendero.
2. **Didit primero**, siempre: registro y cada retiro con prueba de vida y comparación facial; Verifik valida la
   cédula.
3. La entrega la confirman **las dos partes**: el tendero con el código de 4 dígitos y el cliente con "recibí".
4. La comisión del tendero va **por liquidez** (1 % + 2 % × monto / efectivo libre, mínimo 1.000); Caja de Barrio cobra
   siempre el **1 %**.
5. El pago se aprueba escribiendo **APROBAR** en el chat, contra un **cupo** aprobado una sola vez en la billetera.
   Las **políticas** son obligatorias.

## Open Payments, de dos formas

- **Modo propio** (`OP_MODO=propio`): Caja de Barrio es el **proveedor de billeteras** con su propio Rafiki
  (`op.cajadebarrio.lat`):
  - dos cobros (tienda y plataforma), dos cotizaciones, el grant interactivo y los pagos salientes;
  - la liquidez queda respaldada por la billetera virtual.
- **Modo testnet** (`OP_MODO=testnet`): el backend es **cliente de Open Payments** sobre wallets del testnet de
  Interledger, con un pago **entre monedas** (el cliente paga en USD y la tienda recibe COP). Ver
  [`backend/docs/modo-testnet.md`](backend/docs/modo-testnet.md).

Los dos modos se probaron de punta a punta en producción con el agente:
- registro con Didit y Verifik;
- reserva, riesgo, cupo, APROBAR y pago;
- entrega con código y doble confirmación.

## Uso de IA

Cada carpeta conserva su `AI_USAGE.md` y su `prompts/`. El resumen y el prompt de este repositorio están en
[`AI_USAGE.md`](AI_USAGE.md) y [`prompts/`](prompts/).
