/**
 * Fachada /admin/* sobre el store mock. Imita los endpoints de
 * z3312/panel-de-control-caja-de-barrio.md §5 para poder cambiarla por
 * panel-api (Go) sin tocar las páginas. Las lecturas son selectores puros sobre
 * el estado; las escrituras son asíncronas, exigen motivo y pasan por auditoría.
 */
import { actions } from '../data/mockStore';
import { REGLAS_ALERTA } from '../data/mock/alertas';
import { RETIROS_POR_HORA } from '../data/mock/tiendas';

let actor = null;
export const setActor = (user) => {
  actor = user;
};

const LATENCY = 260;
const call = (fn) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      }
    }, LATENCY);
  });

/* ---------- Escrituras (POST/PUT /admin/...) ---------- */
export const admin = {
  // POST /admin/personas/{id}/aprobar|rechazar|reintento|bloquear|desbloquear
  aprobarPersona: (id, motivo) => call(() => actions.aprobarPersona(actor, id, motivo)),
  rechazarPersona: (id, motivo) => call(() => actions.rechazarPersona(actor, id, motivo)),
  pedirReintento: (id, motivo) => call(() => actions.pedirReintento(actor, id, motivo)),
  bloquearPersona: (id, motivo) => call(() => actions.bloquearPersona(actor, id, motivo)),
  solicitarDesbloqueoPersona: (id, motivo) => call(() => actions.solicitarDesbloqueoPersona(actor, id, motivo)),
  ajustarTopePersona: (id, valor, motivo) => call(() => actions.ajustarTopePersona(actor, id, valor, motivo)),
  revelarDato: (tipo, id, campo) => actions.revelarDato(actor, tipo, id, campo),

  // POST /admin/tiendas/{id}/estado|nivel
  suspenderTienda: (id, motivo) => call(() => actions.suspenderTienda(actor, id, motivo)),
  activarTienda: (id, motivo) => call(() => actions.activarTienda(actor, id, motivo)),
  cambiarNivelTienda: (id, nivel, motivo) => call(() => actions.cambiarNivelTienda(actor, id, nivel, motivo)),
  ajustarTopeTienda: (id, valor, motivo) => call(() => actions.ajustarTopeTienda(actor, id, valor, motivo)),

  // POST /admin/reservas/{id}/cancelar · POST /admin/retiros/{id}/disputa
  cancelarReserva: (id, motivo) => call(() => actions.cancelarReserva(actor, id, motivo)),
  abrirDisputa: (id, motivo) => call(() => actions.abrirDisputa(actor, id, motivo)),
  adjuntarEvidencia: (id, texto) => call(() => actions.adjuntarEvidencia(actor, id, texto)),
  // POST /admin/retiros/{id}/resolver-disputa  (solo cambia estado; no mueve dinero)
  resolverDisputa: (id, resolucion, motivo) => call(() => actions.resolverDisputa(actor, id, resolucion, motivo)),

  // POST /admin/solicitudes-tendero/{id}/aprobar|rechazar|pedir-correccion
  aprobarSolicitud: (id, nivel, motivo) => call(() => actions.aprobarSolicitud(actor, id, nivel, motivo)),
  rechazarSolicitud: (id, motivo) => call(() => actions.rechazarSolicitud(actor, id, motivo)),
  pedirCorreccionSolicitud: (id, campos, motivo) => call(() => actions.pedirCorreccionSolicitud(actor, id, campos, motivo)),

  // POST /admin/alertas/{id}/resolver
  resolverAlerta: (id, accion, motivo) => call(() => actions.resolverAlerta(actor, id, accion, motivo)),
  marcarUiaf: (id, motivo) => call(() => actions.marcarUiaf(actor, id, motivo)),

  // POST /admin/aprobaciones/{id}
  decidirAprobacion: (id, decision, motivo) => call(() => actions.decidirAprobacion(actor, id, decision, motivo)),

  // PUT /admin/configuracion · POST /admin/emergencia
  guardarConfig: (nueva, motivo) => call(() => actions.guardarConfig(actor, nueva, motivo)),
  setEmergencia: (activa, motivo) => call(() => actions.setEmergencia(actor, activa, motivo)),
};

/* ---------- Lecturas (GET /admin/...) ---------- */

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const tiendasVisibles = (state, user) =>
  user.rol === 'aliado' ? state.tiendas.filter((t) => t.redId === user.redId) : state.tiendas;

export const efectivoLibre = (t) => Math.max(0, t.efectivo_publicado_cop - t.efectivo_reservado_cop);

export const alertaPendiente = (a) => a.estado === 'abierta' || a.estado === 'escalada';

// GET /admin/resumen
export function selectResumen(state, user) {
  if (user.rol === 'aliado') {
    const tiendas = tiendasVisibles(state, user);
    const ids = new Set(tiendas.map((t) => t.id));
    const entregadas = state.reservas.filter((r) => ids.has(r.tienda_id) && r.estado === 'entregada');
    return {
      kpis: [
        { key: 'tiendas', label: 'Tiendas activas de tu red', value: tiendas.filter((t) => t.estado === 'activa').length, icon: 'store', to: '/tiendas?estado=activa' },
        { key: 'efectivo', label: 'Efectivo libre publicado', value: tiendas.reduce((a, t) => a + efectivoLibre(t), 0), format: 'cop', icon: 'banknote', to: '/tiendas' },
        { key: 'entregas', label: 'Entregas completadas hoy', value: entregadas.length, icon: 'check', hint: 'En tu red' },
        { key: 'monto', label: 'Monto entregado hoy', value: entregadas.reduce((a, r) => a + r.monto_cop, 0), format: 'cop', icon: 'wallet', hint: 'En tu red' },
        { key: 'reclamos', label: 'Reclamos abiertos', value: tiendas.reduce((a, t) => a + t.reclamos, 0), icon: 'flag', tone: 'danger', to: '/tiendas' },
      ],
    };
  }
  const entregadas = state.reservas.filter((r) => r.estado === 'entregada');
  const activas = state.tiendas.filter((t) => t.estado === 'activa');
  return {
    kpis: [
      { key: 'retiros', label: 'Retiros completados', value: entregadas.length, icon: 'check', to: '/retiros?estado=entregada', hint: 'Hoy' },
      { key: 'monto', label: 'Monto entregado', value: entregadas.reduce((a, r) => a + r.monto_cop, 0), format: 'cop', icon: 'wallet', to: '/retiros?estado=entregada', hint: 'Hoy' },
      { key: 'pendientes', label: 'Registros por revisar', value: state.personas.filter((p) => p.estado_registro === 'revision_manual').length, icon: 'users', to: '/personas?estado=revision_manual', hint: 'Cola de revisión manual' },
      { key: 'solicitudes', label: 'Solicitudes de tendero', value: state.solicitudes.filter(solicitudPendiente).length, icon: 'clipboard', to: '/solicitudes', hint: 'En revisión', role: 'solicitudes' },
      { key: 'alertas', label: 'Alertas abiertas', value: state.alertas.filter(alertaPendiente).length, icon: 'alert', tone: 'danger', to: '/alertas?estado=pendientes', hint: 'Abiertas y escaladas', role: 'alertas' },
      { key: 'tiendas', label: 'Tiendas activas', value: activas.length, icon: 'store', to: '/tiendas?estado=activa', hint: `de ${state.tiendas.length} registradas` },
      { key: 'efectivo', label: 'Efectivo disponible publicado', value: activas.reduce((a, t) => a + efectivoLibre(t), 0), format: 'cop', icon: 'banknote', to: '/tiendas?estado=activa', hint: 'Publicado menos reservado' },
    ],
    porHora: RETIROS_POR_HORA,
  };
}

// GET /admin/personas
export function selectPersonas(state, { estado, q } = {}) {
  let rows = state.personas;
  if (estado && estado !== 'todas') rows = rows.filter((p) => p.estado_registro === estado);
  if (q) {
    const n = norm(q);
    rows = rows.filter((p) => norm(p.nombre).includes(n) || p.cedula.replace(/\D/g, '').endsWith(n.replace(/\D/g, '') || '§') || p.id.includes(n));
  }
  const byDateAsc = (a, b) => new Date(a.creada_en) - new Date(b.creada_en);
  const byDateDesc = (a, b) => new Date(b.creada_en) - new Date(a.creada_en);
  if (estado === 'revision_manual') return [...rows].sort(byDateAsc);
  return [...rows].sort((a, b) => {
    const qa = a.estado_registro === 'revision_manual' ? 0 : 1;
    const qb = b.estado_registro === 'revision_manual' ? 0 : 1;
    return qa - qb || byDateDesc(a, b);
  });
}

export const countPersonasPorEstado = (state) =>
  state.personas.reduce((acc, p) => ({ ...acc, [p.estado_registro]: (acc[p.estado_registro] || 0) + 1 }), {});

// GET /admin/tiendas
export function selectTiendas(state, user, { nivel, estado, barrio, reputacion, q } = {}) {
  let rows = tiendasVisibles(state, user);
  if (nivel && nivel !== 'todos') rows = rows.filter((t) => t.nivel === nivel);
  if (estado && estado !== 'todos') rows = rows.filter((t) => t.estado === estado);
  if (barrio && barrio !== 'todos') rows = rows.filter((t) => t.barrio === barrio);
  if (reputacion === 'alta') rows = rows.filter((t) => t.reputacion >= 4.5);
  if (reputacion === 'media') rows = rows.filter((t) => t.reputacion >= 4 && t.reputacion < 4.5);
  if (reputacion === 'baja') rows = rows.filter((t) => t.reputacion > 0 && t.reputacion < 4);
  if (q) {
    const n = norm(q);
    rows = rows.filter((t) => norm(t.nombre).includes(n) || norm(t.barrio).includes(n));
  }
  return rows;
}

// GET /admin/retiros
export function selectReservas(state, { estado, q } = {}) {
  let rows = [...state.reservas].sort((a, b) => new Date(b.creada_en) - new Date(a.creada_en));
  if (estado && estado !== 'todas') rows = rows.filter((r) => r.estado === estado);
  if (q) {
    const n = norm(q);
    rows = rows.filter((r) => {
      const p = state.personas.find((x) => x.id === r.persona_id);
      const t = state.tiendas.find((x) => x.id === r.tienda_id);
      return norm(r.id).includes(n) || norm(p?.nombre).includes(n) || norm(t?.nombre).includes(n);
    });
  }
  return rows;
}

// GET /admin/solicitudes-tendero
export const solicitudPendiente = (x) => x.estado === 'en_revision';

export function semaforo(x) {
  return x.checks.reduce((acc, c) => ({ ...acc, [c.estado]: (acc[c.estado] || 0) + 1 }), { ok: 0, alerta: 0, error: 0 });
}

export function selectSolicitudes(state, { estado = 'en_revision', q } = {}) {
  let rows = [...state.solicitudes];
  if (estado && estado !== 'todas') rows = rows.filter((x) => x.estado === estado);
  if (q) {
    const n = norm(q);
    rows = rows.filter((x) => norm(`${x.solicitante.nombre} ${x.tienda.nombre} ${x.tienda.barrio} ${x.id}`).includes(n));
  }
  // Cola: de la más antigua a la más reciente.
  return rows.sort((a, b) => new Date(a.creada_en) - new Date(b.creada_en));
}

// GET /admin/alertas
export function selectAlertas(state, { estado = 'pendientes', regla } = {}) {
  let rows = [...state.alertas].sort((a, b) => new Date(b.creada_en) - new Date(a.creada_en));
  if (estado === 'pendientes') rows = rows.filter(alertaPendiente);
  else if (estado === 'cerradas') rows = rows.filter((a) => !alertaPendiente(a));
  else if (estado !== 'todas') rows = rows.filter((a) => a.estado === estado);
  if (regla && regla !== 'todas') rows = rows.filter((a) => a.regla === regla);
  return rows;
}

// GET /admin/alertas/exportar
export function exportRowsUiaf(state) {
  return state.alertas
    .filter((a) => a.uiaf)
    .map((a) => ({
      alerta: a.id,
      regla: REGLAS_ALERTA[a.regla],
      detalle: a.detalle,
      persona: state.personas.find((p) => p.id === a.persona_id)?.nombre || '',
      tienda: state.tiendas.find((t) => t.id === a.tienda_id)?.nombre || '',
      creada_en: a.creada_en,
      estado: a.estado,
      resolucion: a.resolucion || '',
    }));
}

// GET /admin/auditoria
export function selectAuditoria(state, { actor: a, accion, entidad, q } = {}) {
  let rows = state.auditoria;
  if (a && a !== 'todos') rows = rows.filter((r) => r.actor === a);
  if (accion && accion !== 'todas') rows = rows.filter((r) => r.accion === accion);
  if (entidad && entidad !== 'todas') rows = rows.filter((r) => r.entidad_tipo === entidad);
  if (q) {
    const n = norm(q);
    rows = rows.filter((r) => norm(`${r.entidad_nombre} ${r.entidad_id} ${r.motivo} ${r.id}`).includes(n));
  }
  return rows;
}

// GET /admin/aprobaciones
export const selectAprobacionesPendientes = (state) => state.aprobaciones.filter((a) => a.estado === 'pendiente');
