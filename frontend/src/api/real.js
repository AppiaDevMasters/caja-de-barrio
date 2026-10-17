/**
 * Cliente real de `/admin/*` (panel-api en Go). Expone los mismos nombres que la
 * fachada mock (`admin.*`) y agrega las lecturas `get*` del mapeo de
 * z3312/panel-de-control-v2.md §5.2 y z3312/panel-de-control-v3.md §3. El backend escribe la auditoría: aquí solo se envía el `motivo`.
 *
 * Inicio, Personas, Tiendas, Saldos, Retiros, Alertas y Auditoría leen de aquí (vía `useAdminQuery`);
 * Solicitudes, aprobaciones y configuración siguen en mock (el backend aún no las tiene).
 */
import { http } from './http';
import { adaptAlerta, adaptAuditoria, adaptPersona, adaptRetiro, adaptSaldos, adaptTienda, lista } from './adapt';

const e = encodeURIComponent;
const un = (r) => r?.valor ?? r;

export const auth = {
  login: (username, password) => http.post('/admin/auth/login', { username, password }),
  logout: () => http.post('/admin/auth/logout'),
  yo: () => http.get('/admin/auth/yo'),
};

/* ---------- Escrituras (mismos nombres que `admin` en admin.js) ---------- */
export const admin = {
  aprobarPersona: (id, motivo) => http.post(`/admin/personas/${e(id)}/aprobar`, { motivo }),
  rechazarPersona: (id, motivo) => http.post(`/admin/personas/${e(id)}/rechazar`, { motivo }),
  pedirReintento: (id, motivo) => http.post(`/admin/personas/${e(id)}/reintento`, { motivo }),
  bloquearPersona: (id, motivo) => http.post(`/admin/personas/${e(id)}/bloquear`, { motivo }),
  solicitarDesbloqueoPersona: (id, motivo) => http.post(`/admin/personas/${e(id)}/desbloquear`, { motivo }),
  ajustarTopePersona: (id, valor, motivo) => http.put(`/admin/personas/${e(id)}/tope`, { valor: Number(valor), motivo }),
  revelarDato: async (tipo, id, campo) => un(await http.post(`/admin/${tipo === 'persona' ? 'personas' : tipo === 'solicitud' ? 'solicitudes-tendero' : 'tiendas'}/${e(id)}/revelar`, { campo })),

  // POST /admin/tenderos → ficha de la tienda en `pendiente_verificacion`
  registrarTendero: async (datos) => adaptTienda(await http.post('/admin/tenderos', datos)),

  suspenderTienda: (id, motivo) => http.post(`/admin/tiendas/${e(id)}/estado`, { estado: 'suspendida', motivo }),
  activarTienda: (id, motivo) => http.post(`/admin/tiendas/${e(id)}/estado`, { estado: 'activa', motivo }),
  cambiarNivelTienda: (id, nivel, motivo) => http.post(`/admin/tiendas/${e(id)}/nivel`, { nivel, motivo }),
  ajustarTopeTienda: (id, valor, motivo) => http.put(`/admin/tiendas/${e(id)}/tope`, { valor: Number(valor), motivo }),

  cancelarReserva: (id, motivo) => http.post(`/admin/retiros/${e(id)}/cancelar`, { motivo }),
  abrirDisputa: (id, motivo) => http.post(`/admin/retiros/${e(id)}/disputa`, { motivo }),
  adjuntarEvidencia: (id, texto) => http.post(`/admin/retiros/${e(id)}/evidencia`, { texto }),
  resolverDisputa: (id, resolucion, motivo) => http.post(`/admin/retiros/${e(id)}/resolver-disputa`, { resolucion, motivo }),

  aprobarSolicitud: (id, nivel, motivo) => http.post(`/admin/solicitudes-tendero/${e(id)}/aprobar`, { nivel, motivo }),
  rechazarSolicitud: (id, motivo) => http.post(`/admin/solicitudes-tendero/${e(id)}/rechazar`, { motivo }),
  pedirCorreccionSolicitud: (id, campos, motivo) => http.post(`/admin/solicitudes-tendero/${e(id)}/pedir-correccion`, { campos, motivo }),

  resolverAlerta: (id, accion, motivo) => http.post(`/admin/alertas/${e(id)}/resolver`, { accion, motivo }),
  marcarUiaf: (id, motivo) => http.post(`/admin/alertas/${e(id)}/uiaf`, { motivo }),

  decidirAprobacion: (id, decision, motivo) => http.post(`/admin/aprobaciones/${e(id)}`, { decision, motivo }),

  guardarConfig: (nueva, motivo) => http.put('/admin/configuracion', { ...nueva, motivo }),
  setEmergencia: (activa, motivo) => http.post('/admin/emergencia', { activa, motivo }),
};

/* ---------- Lecturas asíncronas (GET /admin/...) ---------- */
// Listas: `{ items, total }`. En la hackathon se pide todo (`por_pagina=500`) y se filtra en memoria.
const LISTA = { pagina: 1, por_pagina: 500 };

export const getResumen = () => http.get('/admin/resumen');
export const getPersonas = async (f) => lista(await http.get('/admin/personas', f), 'personas').map(adaptPersona);
export const getPersona = async (id) => adaptPersona(await http.get(`/admin/personas/${e(id)}`));
export const getTiendas = async (f) => lista(await http.get('/admin/tiendas', f), 'tiendas').map(adaptTienda);
export const getTienda = async (id) => adaptTienda(await http.get(`/admin/tiendas/${e(id)}`));
// GET /admin/saldos → lista de billeteras · GET /admin/saldos?wallet= → saldo y movimientos de una billetera
export const getSaldos = async () => adaptSaldos(await http.get('/admin/saldos'));
export const getSaldoWallet = (wallet) => http.get('/admin/saldos', { wallet });
export const getRetiros = async (f) => lista(await http.get('/admin/retiros', f), 'retiros').map(adaptRetiro);
export const getRetiro = async (id) => adaptRetiro(await http.get(`/admin/retiros/${e(id)}`));
export const getSolicitudes = (f) => http.get('/admin/solicitudes-tendero', { ...LISTA, ...f });
export const getSolicitud = (id) => http.get(`/admin/solicitudes-tendero/${e(id)}`);
// `estado`: pendientes | cerradas | todas. El panel pide `todas` y filtra en memoria.
export const getAlertas = async (f) => lista(await http.get('/admin/alertas', f), 'alertas').map(adaptAlerta);
export const getAlertasExport = () => http.get('/admin/alertas/exportar');
export const getAprobaciones = () => http.get('/admin/aprobaciones', { estado: 'pendiente' });
export const getAuditoria = async (f) => lista(await http.get('/admin/auditoria', f), 'auditoria').map(adaptAuditoria);
export const getConfiguracion = () => http.get('/admin/configuracion');
