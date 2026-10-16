/**
 * Cliente real de `/admin/*` (panel-api en Go). Expone los mismos nombres que la
 * fachada mock (`admin.*`) y agrega las lecturas `get*` del mapeo de
 * z3312/panel-de-control-v2.md §5.2. El backend escribe la auditoría: aquí solo se envía el `motivo`.
 *
 * Estado actual: las páginas siguen leyendo del store mock (selectores síncronos); este módulo deja
 * cableadas las escrituras y las lecturas asíncronas para cuando el backend esté vivo.
 */
import { http } from './http';

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
export const getPersonas = (f) => http.get('/admin/personas', { ...LISTA, ...f });
export const getPersona = (id) => http.get(`/admin/personas/${e(id)}`);
export const getTiendas = (f) => http.get('/admin/tiendas', { ...LISTA, ...f });
export const getTienda = (id) => http.get(`/admin/tiendas/${e(id)}`);
export const getRetiros = (f) => http.get('/admin/retiros', { ...LISTA, ...f });
export const getRetiro = (id) => http.get(`/admin/retiros/${e(id)}`);
export const getSolicitudes = (f) => http.get('/admin/solicitudes-tendero', { ...LISTA, ...f });
export const getSolicitud = (id) => http.get(`/admin/solicitudes-tendero/${e(id)}`);
export const getAlertas = (f) => http.get('/admin/alertas', { ...LISTA, ...f });
export const getAlertasExport = () => http.get('/admin/alertas/exportar');
export const getAprobaciones = () => http.get('/admin/aprobaciones', { estado: 'pendiente' });
export const getAuditoria = (f) => http.get('/admin/auditoria', { ...LISTA, ...f });
export const getConfiguracion = () => http.get('/admin/configuracion');
