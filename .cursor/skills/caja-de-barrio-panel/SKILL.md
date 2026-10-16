---
name: caja-de-barrio-panel
description: >-
  Product and domain context for the Caja de Barrio operations panel (Open Payments
  Hackathon). Use when building panel modules, roles, KYC queues, retiros, alertas,
  auditoría, or when the user mentions Caja de Barrio, cumplimiento, or el panel.
---

# Panel de control · Caja de Barrio

## Fuentes de verdad (leer antes de implementar)

1. **Producto / dominio:** [`z3312/panel-de-control-caja-de-barrio.md`](../../../z3312/panel-de-control-caja-de-barrio.md)
2. **Design system (Master):** [`design-system/MASTER.md`](../../../design-system/MASTER.md)
3. **Overrides por página:** `design-system/pages/<pagina>.md` (si existe, gana sobre Master)
4. **Inteligencia UI/UX:** skill `ui-ux-pro-max`
5. **Animación:** skill `motion` (`npm install motion` → `motion/react`)

No inventar módulos, roles ni endpoints fuera de ese documento de producto. Si hace falta algo nuevo, proponerlo explícitamente al usuario.

## Qué es el panel

Consola interna del equipo de operación: decide quién entra a la red (personas y tiendas), vigila cada retiro y reacciona ante alertas de riesgo. El agente de WhatsApp atiende usuarios; aquí los humanos tienen la última palabra.

## Principios (no negociables)

1. Nada entra sin revisión trazable (estado + motivo + autor).
2. El panel no salta reglas del sistema (mismas validaciones que MCP; sin “forzar” pagos).
3. Mínimo privilegio por rol.
4. Datos sensibles protegidos (cédulas enmascaradas, sin selfies propias, Ley 1581).

## Roles

| Rol | Puede (resumen) |
| --- | --- |
| Superadministrador | Todo + config global + interruptor de emergencia |
| Oficial de cumplimiento | Aprobar/rechazar/bloquear, alertas, auditoría, export UIAF |
| Operador de soporte | Ver enmascarado, reintento, cancelar reservas, disputas (no aprueba) |
| Aliado (lectura) | Solo lectura/export de su red |

**Cuatro ojos:** desbloquear por riesgo o subir tienda a Aliado requiere dos aprobadores distintos (cumplimiento o superior).

## Módulos a construir (orden de dominio)

1. Inicio (indicadores del día)
2. Personas (cola + ficha + acciones con motivo)
3. Tiendas (lista + ficha + nivel/estado)
4. Reservas y retiros (lista + línea de tiempo Open Payments; sin “marcar pagado” ni “entregar sin face match”)
5. Alertas de riesgo
6. Mapa de liquidez (H3 / PostGIS — fase posterior)
7. Auditoría (solo lectura, inmutable)
8. Configuración + interruptor de emergencia

## Stack de este frontend

- Repo: `frontend-caja-de-barrio` (React)
- Animación: `motion` (ver skill `motion`)
- Diseño: generar/actualizar Master con ui-ux-pro-max `--design-system --persist`
- Acciones de negocio: vía API/admin y herramientas MCP internas del doc de producto (no reimplementar reglas en el cliente)

## Flujo de trabajo del agente (cuando toque implementar UI)

1. Leer el módulo pedido en `z3312/panel-de-control-caja-de-barrio.md`
2. Leer `design-system/MASTER.md` (+ override de página si existe)
3. Si falta Master o hay que regenerar look: skill `ui-ux-pro-max` con query orientada a **compliance admin dashboard / fintech operations / trust / Medellín**
4. Animar solo con skill `motion` y tokens del Master
5. Entregar respetando checklist de ui-ux-pro-max + reglas de enmascarado/auditoría del dominio
