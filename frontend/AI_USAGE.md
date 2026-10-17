# AI_USAGE

Política de IA del Open Payments Hackathon (Medellín, 16–17 de octubre de 2026). Este repo es `frontend-caja-de-barrio`, el panel de operación (`panel-web`) de Caja de Barrio.

## Herramientas usadas

| Herramienta | Para qué | Dónde |
| --- | --- | --- |
| Cursor (agente de código, modelo Claude) | Planear y escribir el panel de administración con datos mock: shell, login por roles, módulos, store mock y pruebas | `src/` completo, `public/index.html`, `public/manifest.json`, este archivo |
| Skill `ui-ux-pro-max` (en `.cursor/skills/`) | Generar y ajustar el design system (Master) del panel | `design-system/MASTER.md` |
| Skills `caja-de-barrio-panel` y `motion` (en `.cursor/skills/`) | Dominio del producto y convenciones de animación | Guía para el agente; sin código propio |

## Qué se generó con IA

| Área | Archivos |
| --- | --- |
| Tokens y estilos (Master: ámbar/teal, Fira Sans y Fira Code) | `src/styles/tokens.css`, `src/styles/app.css` |
| Autenticación mock y permisos por rol | `src/auth/AuthContext.jsx`, `src/auth/permissions.js`, `src/data/mock/users.js` |
| Datos mock (personas, tiendas de Aranjuez, reservas con línea de tiempo Open Payments, alertas, auditoría, configuración, aprobaciones) | `src/data/mock/*.js` |
| Store mock que simula las herramientas internas de los MCP (motivo obligatorio, auditoría, cuatro ojos) | `src/data/mockStore.js`, `src/api/admin.js` |
| Layout y componentes de UI | `src/components/layout/*`, `src/components/ui/*` |
| Páginas: Inicio, Personas, Tiendas, Reservas y retiros, Alertas, Auditoría, Configuración, Mapa (stub) | `src/pages/*` |
| Pruebas de las invariantes del panel | `src/data/mockStore.test.js` |

## Reglas que se respetaron

- Todo el código se escribió durante el evento; no se trajo código prediseñado de otros proyectos. Solo se usan librerías públicas: `react`, `react-router-dom`, `lucide-react`, `motion`.
- Sin secretos: el frontend no contiene llaves de Open Payments, Verifik ni Didit. Las credenciales de login son solo del mock de QA y se reemplazan por `panel-api` (JWT + TOTP).
- No se integró Wompi ni otras pasarelas.
- El panel no puede marcar pagos ni entregar billetes: esa lógica vive en los servidores MCP.

## Prompts

Los prompts reales usados con el agente están en [`prompts/`](prompts/).
