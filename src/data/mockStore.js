import { useSyncExternalStore } from 'react';
import { can } from '../auth/permissions';
import { PERSONAS } from './mock/personas';
import { TIENDAS } from './mock/tiendas';
import { RESERVAS } from './mock/reservas';
import { ALERTAS } from './mock/alertas';
import { SOLICITUDES, CAMPOS_CORRECCION } from './mock/solicitudes';
import { AUDITORIA } from './mock/auditoria';
import { APROBACIONES, TIPO_APROBACION } from './mock/aprobaciones';
import { CONFIG_INICIAL, CONFIG_LABELS, TOPE_MAX_PERSONA } from './mock/config';

/**
 * Store mock en memoria. Simula las herramientas internas de los servidores MCP
 * (cambiar_estado_persona, cancelar_reserva, resolver_alerta, pausar_retiros...):
 * valida reglas de dominio, exige motivo y escribe auditoría en cada mutación.
 * Las claves de Open Payments, Verifik y Didit nunca pasan por aquí.
 */

export const MOTIVO_MIN = 10;

const clone = (v) => JSON.parse(JSON.stringify(v));

export const NOTIF_SOLICITUD = {
  aprobada: '¡Tu tienda quedó activa! Ya puedes publicar tu efectivo del día.',
  rechazada: 'No pudimos aprobar tu solicitud de tienda por ahora.',
  correccion: 'Necesitamos que corrijas un dato de tu solicitud. Te lo pedimos por aquí.',
};

const NOTIF = {
  aprobada: 'Tu registro fue aprobado.',
  rechazada: 'Tu registro no pudo ser aprobado.',
  pendiente: 'Necesitamos que repitas la verificación.',
  bloqueada: 'Tu cuenta está en revisión. Te escribiremos pronto.',
};

const VIGENCIA_IDENTIDAD_MIN = 30;

// v2: de cada reserva sale (a) cuándo escribió «APROBAR» la persona en el chat y
// (b) hasta cuándo vale su verificación de identidad (Didit, 30 minutos).
function derivarPersonas(personas, reservas) {
  return personas.map((p) => {
    const suyas = reservas.filter((r) => r.persona_id === p.id);
    const aprobaciones = suyas
      .map((r) => ({ r, s: r.timeline.find((x) => x.key === 'aprobacion' && x.estado === 'ok') }))
      .filter((x) => x.s)
      .map(({ r, s }) => ({
        reserva_id: r.id,
        ts: s.ts,
        texto: 'APROBAR',
        total_cop: r.total_cop,
        monto_cop: r.monto_cop,
      }))
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const ultima = suyas
      .map((r) => r.timeline.find((x) => x.key === 'identidad' && x.estado === 'ok')?.ts)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    return {
      ...p,
      aprobaciones,
      verificacion_vigente_hasta: ultima ? new Date(new Date(ultima).getTime() + VIGENCIA_IDENTIDAD_MIN * 60000).toISOString() : null,
    };
  });
}

function initialState() {
  const reservas = clone(RESERVAS);
  return {
    seq: { aud: AUDITORIA.length, ap: APROBACIONES.length },
    personas: derivarPersonas(clone(PERSONAS), reservas),
    tiendas: clone(TIENDAS),
    reservas,
    alertas: clone(ALERTAS),
    solicitudes: clone(SOLICITUDES),
    auditoria: clone(AUDITORIA),
    aprobaciones: clone(APROBACIONES),
    config: clone(CONFIG_INICIAL),
  };
}

let state = initialState();
const listeners = new Set();

export const getState = () => state;
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const useStoreState = () => useSyncExternalStore(subscribe, getState);

function commit(next) {
  state = next;
  listeners.forEach((fn) => fn());
}

export function resetStore() {
  commit(initialState());
}

/* ---------- helpers ---------- */

const upd = (arr, id, fn) => arr.map((x) => (x.id === id ? fn(x) : x));

function guard(actor, perm) {
  if (!actor || !can(actor.rol, perm)) {
    throw new Error('Tu rol no tiene permiso para esta acción.');
  }
}

function needMotivo(motivo) {
  const m = String(motivo || '').trim();
  if (m.length < MOTIVO_MIN) {
    throw new Error(`El motivo es obligatorio (mínimo ${MOTIVO_MIN} caracteres).`);
  }
  return m;
}

function addAudit(s, actor, entry) {
  const n = s.seq.aud + 1;
  return {
    ...s,
    seq: { ...s.seq, aud: n },
    auditoria: [
      {
        id: `AUD-${String(n).padStart(4, '0')}`,
        ts: new Date().toISOString(),
        actor: actor.username,
        rol: actor.rol,
        ip: '10.20.4.17',
        ...entry,
      },
      ...s.auditoria,
    ],
  };
}

const evento = (actor, detalle) => ({
  ts: new Date().toISOString(),
  tipo: 'accion_panel',
  actor: actor.nombre,
  detalle,
});

const getPersona = (id) => {
  const p = state.personas.find((x) => x.id === id);
  if (!p) throw new Error('Persona no encontrada.');
  return p;
};
const getTienda = (id) => {
  const t = state.tiendas.find((x) => x.id === id);
  if (!t) throw new Error('Tienda no encontrada.');
  return t;
};
const getReserva = (id) => {
  const r = state.reservas.find((x) => x.id === id);
  if (!r) throw new Error('Reserva no encontrada.');
  return r;
};
const getSolicitud = (id) => {
  const x = state.solicitudes.find((y) => y.id === id);
  if (!x) throw new Error('Solicitud no encontrada.');
  return x;
};
const getAlerta = (id) => {
  const a = state.alertas.find((x) => x.id === id);
  if (!a) throw new Error('Alerta no encontrada.');
  return a;
};

function setPersonaEstado(s, actor, persona, nuevo, motivo, accion, actorLabel) {
  const entry = {
    ts: new Date().toISOString(),
    estado_anterior: persona.estado_registro,
    estado_nuevo: nuevo,
    actor: actorLabel || actor.nombre,
    motivo,
    notificacion: NOTIF[nuevo],
  };
  const next = {
    ...s,
    personas: upd(s.personas, persona.id, (x) => ({
      ...x,
      estado_registro: nuevo,
      motivo_revision: nuevo === 'revision_manual' ? x.motivo_revision : null,
      historial: [entry, ...x.historial],
    })),
  };
  return addAudit(next, actor, {
    accion,
    entidad_tipo: 'persona',
    entidad_id: persona.id,
    entidad_nombre: persona.nombre,
    antes: persona.estado_registro,
    despues: nuevo,
    motivo,
  });
}

function setTiendaEstado(s, actor, tienda, nuevo, motivo, accion, porRiesgo = false) {
  const next = {
    ...s,
    tiendas: upd(s.tiendas, tienda.id, (x) => ({
      ...x,
      estado: nuevo,
      suspension_riesgo: nuevo === 'suspendida' ? porRiesgo : false,
    })),
  };
  return addAudit(next, actor, {
    accion,
    entidad_tipo: 'tienda',
    entidad_id: tienda.id,
    entidad_nombre: tienda.nombre,
    antes: tienda.estado + (tienda.suspension_riesgo ? ' (riesgo)' : ''),
    despues: nuevo + (nuevo === 'suspendida' && porRiesgo ? ' (riesgo)' : ''),
    motivo,
  });
}

function crearAprobacion(s, actor, tipo, entidad, motivo) {
  if (s.aprobaciones.some((a) => a.estado === 'pendiente' && a.tipo === tipo && a.entidad.id === entidad.id)) {
    throw new Error('Ya existe una solicitud pendiente de cuatro ojos para este registro.');
  }
  const n = s.seq.ap + 1;
  const ap = {
    id: `AP-${String(n).padStart(3, '0')}`,
    tipo,
    entidad,
    solicitada_en: new Date().toISOString(),
    motivo,
    estado: 'pendiente',
    firmas: [
      { usuario: actor.username, nombre: actor.nombre, ts: new Date().toISOString(), decision: 'aprobar', motivo },
    ],
  };
  const next = { ...s, seq: { ...s.seq, ap: n }, aprobaciones: [ap, ...s.aprobaciones] };
  return {
    state: addAudit(next, actor, {
      accion: 'solicitar_aprobacion',
      entidad_tipo: entidad.tipo,
      entidad_id: entidad.id,
      entidad_nombre: entidad.nombre,
      antes: '—',
      despues: `${TIPO_APROBACION[tipo]} · 1 de 2 firmas`,
      motivo,
    }),
    ap,
  };
}

/* ---------- Personas ---------- */

export const actions = {
  aprobarPersona(actor, id, motivo) {
    guard(actor, 'persona.aprobar');
    const m = needMotivo(motivo);
    const p = getPersona(id);
    if (p.estado_registro !== 'revision_manual') throw new Error('Solo se aprueban registros en revisión manual.');
    commit(setPersonaEstado(state, actor, p, 'aprobada', m, 'aprobar'));
    return { notificacion: NOTIF.aprobada };
  },

  rechazarPersona(actor, id, motivo) {
    guard(actor, 'persona.rechazar');
    const m = needMotivo(motivo);
    const p = getPersona(id);
    if (p.estado_registro !== 'revision_manual') throw new Error('Solo se rechazan registros en revisión manual.');
    commit(setPersonaEstado(state, actor, p, 'rechazada', m, 'rechazar'));
    return { notificacion: NOTIF.rechazada };
  },

  pedirReintento(actor, id, motivo) {
    guard(actor, 'persona.reintento');
    const m = needMotivo(motivo);
    const p = getPersona(id);
    if (p.estado_registro !== 'revision_manual') throw new Error('Solo se pide reintento a registros en revisión manual.');
    commit(setPersonaEstado(state, actor, p, 'pendiente', m, 'pedir_reintento'));
    return { notificacion: NOTIF.pendiente };
  },

  bloquearPersona(actor, id, motivo) {
    guard(actor, 'persona.bloquear');
    const m = needMotivo(motivo);
    const p = getPersona(id);
    if (p.estado_registro !== 'aprobada') throw new Error('Solo se puede bloquear a una persona aprobada.');
    commit(setPersonaEstado(state, actor, p, 'bloqueada', m, 'bloquear'));
    return { notificacion: NOTIF.bloqueada };
  },

  solicitarDesbloqueoPersona(actor, id, motivo) {
    guard(actor, 'persona.desbloquear');
    const m = needMotivo(motivo);
    const p = getPersona(id);
    if (p.estado_registro !== 'bloqueada') throw new Error('La persona no está bloqueada.');
    const r = crearAprobacion(state, actor, 'desbloqueo_persona', { tipo: 'persona', id: p.id, nombre: p.nombre }, m);
    commit(r.state);
    return { aprobacion: r.ap.id };
  },

  ajustarTopePersona(actor, id, valor, motivo) {
    guard(actor, 'persona.tope');
    const m = needMotivo(motivo);
    const p = getPersona(id);
    const v = Number(valor);
    const max = TOPE_MAX_PERSONA[p.nivel];
    if (!Number.isFinite(v) || v <= 0) throw new Error('Ingresa un tope válido.');
    if (v > max) throw new Error(`El tope no puede superar el límite del ${p.nivel} ($${max.toLocaleString('es-CO')}).`);
    const next = {
      ...state,
      personas: upd(state.personas, id, (x) => ({ ...x, tope_retiro_cop: v })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'cambiar_tope',
        entidad_tipo: 'persona',
        entidad_id: p.id,
        entidad_nombre: p.nombre,
        antes: String(p.tope_retiro_cop),
        despues: String(v),
        motivo: m,
      })
    );
  },

  revelarDato(actor, tipo, id, campo) {
    guard(actor, 'persona.revelar');
    let valor;
    let nombre;
    if (tipo === 'persona') {
      const p = getPersona(id);
      valor = p[campo];
      nombre = p.nombre;
    } else if (tipo === 'solicitud') {
      const x = getSolicitud(id);
      valor = x.solicitante[campo];
      nombre = x.solicitante.nombre;
    } else {
      const t = getTienda(id);
      valor = t.dueno.cedula;
      nombre = t.dueno.nombre;
    }
    commit(
      addAudit(state, actor, {
        accion: 'revelar_dato',
        entidad_tipo: tipo,
        entidad_id: id,
        entidad_nombre: nombre,
        antes: `${campo} enmascarado`,
        despues: `${campo} visible`,
        motivo: 'Revelación de dato sensible por clic explícito del operador.',
      })
    );
    return valor;
  },

  /* ---------- Tiendas ---------- */

  suspenderTienda(actor, id, motivo, { porRiesgo = false } = {}) {
    guard(actor, 'tienda.estado');
    const m = needMotivo(motivo);
    const t = getTienda(id);
    if (t.estado === 'suspendida') throw new Error('La tienda ya está suspendida.');
    commit(setTiendaEstado(state, actor, t, 'suspendida', m, 'suspender', porRiesgo));
  },

  activarTienda(actor, id, motivo) {
    guard(actor, 'tienda.estado');
    const m = needMotivo(motivo);
    const t = getTienda(id);
    if (t.estado === 'activa') throw new Error('La tienda ya está activa.');
    if (t.estado === 'suspendida' && t.suspension_riesgo) {
      const r = crearAprobacion(state, actor, 'desbloqueo_tienda', { tipo: 'tienda', id: t.id, nombre: t.nombre }, m);
      commit(r.state);
      return { aprobacion: r.ap.id };
    }
    commit(setTiendaEstado(state, actor, t, 'activa', m, 'activar'));
    return {};
  },

  cambiarNivelTienda(actor, id, nivel, motivo) {
    guard(actor, 'tienda.nivel');
    const m = needMotivo(motivo);
    const t = getTienda(id);
    if (!['basico', 'comercio', 'aliado'].includes(nivel)) throw new Error('Nivel inválido.');
    if (nivel === t.nivel) throw new Error('La tienda ya tiene ese nivel.');
    if (nivel === 'aliado') {
      const r = crearAprobacion(state, actor, 'nivel_aliado_tienda', { tipo: 'tienda', id: t.id, nombre: t.nombre }, m);
      commit(r.state);
      return { aprobacion: r.ap.id };
    }
    const topeMax = state.config.topes[nivel].retiro;
    const next = {
      ...state,
      tiendas: upd(state.tiendas, id, (x) => ({
        ...x,
        nivel,
        tope_retiro_cop: Math.min(x.tope_retiro_cop, topeMax),
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'cambiar_nivel',
        entidad_tipo: 'tienda',
        entidad_id: t.id,
        entidad_nombre: t.nombre,
        antes: t.nivel,
        despues: nivel,
        motivo: m,
      })
    );
    return {};
  },

  ajustarTopeTienda(actor, id, valor, motivo) {
    guard(actor, 'tienda.tope');
    const m = needMotivo(motivo);
    const t = getTienda(id);
    const v = Number(valor);
    const max = state.config.topes[t.nivel].retiro;
    if (!Number.isFinite(v) || v <= 0) throw new Error('Ingresa un tope válido.');
    if (v > max) throw new Error(`El tope no puede superar el límite del nivel ($${max.toLocaleString('es-CO')}).`);
    const next = { ...state, tiendas: upd(state.tiendas, id, (x) => ({ ...x, tope_retiro_cop: v })) };
    commit(
      addAudit(next, actor, {
        accion: 'cambiar_tope',
        entidad_tipo: 'tienda',
        entidad_id: t.id,
        entidad_nombre: t.nombre,
        antes: String(t.tope_retiro_cop),
        despues: String(v),
        motivo: m,
      })
    );
  },

  /* ---------- Solicitudes de tendero ---------- */

  aprobarSolicitud(actor, id, nivel, motivo) {
    guard(actor, 'solicitud.aprobar');
    const m = needMotivo(motivo);
    const x = getSolicitud(id);
    if (x.estado !== 'en_revision') throw new Error('Solo se aprueban solicitudes en revisión.');
    if (!['basico', 'comercio'].includes(nivel)) {
      throw new Error('El alta solo admite nivel básico o comercio. Subir a aliado requiere cuatro ojos desde la ficha de la tienda.');
    }
    if (x.checks.some((c) => c.estado === 'error')) {
      throw new Error('Hay verificaciones en rojo. Pide una corrección o rechaza la solicitud.');
    }
    const n = state.tiendas.length + 1;
    const tiendaId = `t-${String(n).padStart(3, '0')}`;
    const tienda = {
      id: tiendaId,
      nombre: x.tienda.nombre,
      barrio: x.tienda.barrio,
      direccion: x.tienda.direccion,
      lat: x.tienda.lat,
      lon: x.tienda.lon,
      wallet: x.wallet.address,
      nivel,
      estado: 'activa',
      suspension_riesgo: false,
      rut: false,
      ubicacion_verificada: true,
      wallet_ok: x.wallet.resuelve,
      redId: null,
      tope_retiro_cop: state.config.topes[nivel].retiro,
      efectivo_publicado_cop: 0,
      efectivo_reservado_cop: 0,
      reputacion: 0,
      entregas_completadas: 0,
      reclamos: 0,
      dueno: { nombre: x.solicitante.nombre, cedula: x.solicitante.cedula, verificado: true },
      creada_en: new Date().toISOString(),
    };
    const ts = new Date().toISOString();
    const next = {
      ...state,
      tiendas: [...state.tiendas, tienda],
      solicitudes: upd(state.solicitudes, id, (y) => ({
        ...y,
        estado: 'aprobada',
        tienda_id: tiendaId,
        decision: { por: actor.nombre, en: ts, motivo: m },
        historial: [...y.historial, { ts, actor: actor.nombre, accion: 'aprobada', motivo: m }],
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'aprobar_solicitud',
        entidad_tipo: 'solicitud',
        entidad_id: id,
        entidad_nombre: `${x.tienda.nombre} (${x.solicitante.nombre})`,
        antes: 'en_revision',
        despues: `aprobada · tienda ${tiendaId} activa (${nivel})`,
        motivo: m,
      })
    );
    return { tienda_id: tiendaId, notificacion: NOTIF_SOLICITUD.aprobada };
  },

  rechazarSolicitud(actor, id, motivo) {
    guard(actor, 'solicitud.rechazar');
    const m = needMotivo(motivo);
    const x = getSolicitud(id);
    if (!['en_revision', 'correccion_pedida'].includes(x.estado)) {
      throw new Error('La solicitud ya fue resuelta o aún está verificándose.');
    }
    const ts = new Date().toISOString();
    const next = {
      ...state,
      solicitudes: upd(state.solicitudes, id, (y) => ({
        ...y,
        estado: 'rechazada',
        decision: { por: actor.nombre, en: ts, motivo: m },
        historial: [...y.historial, { ts, actor: actor.nombre, accion: 'rechazada', motivo: m }],
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'rechazar_solicitud',
        entidad_tipo: 'solicitud',
        entidad_id: id,
        entidad_nombre: `${x.tienda.nombre} (${x.solicitante.nombre})`,
        antes: x.estado,
        despues: 'rechazada',
        motivo: m,
      })
    );
    return { notificacion: NOTIF_SOLICITUD.rechazada };
  },

  pedirCorreccionSolicitud(actor, id, campos, motivo) {
    guard(actor, 'solicitud.correccion');
    const m = needMotivo(motivo);
    const x = getSolicitud(id);
    if (x.estado !== 'en_revision') throw new Error('Solo se pide corrección sobre solicitudes en revisión.');
    const validos = CAMPOS_CORRECCION.map((c) => c.value);
    const lista = (campos || []).filter((c) => validos.includes(c));
    if (!lista.length) throw new Error('Elige al menos un dato para corregir.');
    const ts = new Date().toISOString();
    const next = {
      ...state,
      solicitudes: upd(state.solicitudes, id, (y) => ({
        ...y,
        estado: 'correccion_pedida',
        correccion: { campos: lista, motivo: m },
        historial: [...y.historial, { ts, actor: actor.nombre, accion: 'pedir_correccion', motivo: m }],
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'pedir_correccion',
        entidad_tipo: 'solicitud',
        entidad_id: id,
        entidad_nombre: `${x.tienda.nombre} (${x.solicitante.nombre})`,
        antes: 'en_revision',
        despues: `correccion_pedida (${lista.join(', ')})`,
        motivo: m,
      })
    );
    return { notificacion: NOTIF_SOLICITUD.correccion };
  },

  /* ---------- Reservas y retiros ---------- */

  cancelarReserva(actor, id, motivo) {
    guard(actor, 'reserva.cancelar');
    const m = needMotivo(motivo);
    const r = getReserva(id);
    if (r.estado !== 'reservada') {
      throw new Error('Solo se puede cancelar una reserva que aún no ha sido pagada.');
    }
    const next = {
      ...state,
      reservas: upd(state.reservas, id, (x) => ({
        ...x,
        estado: 'cancelada',
        cancelada_motivo: m,
        timeline: x.timeline.map((s) => (s.estado === 'pendiente' ? { ...s, estado: 'omitido', ref: null } : s)),
        eventos: [...x.eventos, evento(actor, 'Reserva cancelada desde el panel.')],
      })),
      tiendas: upd(state.tiendas, r.tienda_id, (t) => ({
        ...t,
        efectivo_reservado_cop: Math.max(0, t.efectivo_reservado_cop - r.monto_cop),
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'cancelar_reserva',
        entidad_tipo: 'reserva',
        entidad_id: id,
        entidad_nombre: `Reserva ${id}`,
        antes: 'reservada',
        despues: 'cancelada',
        motivo: m,
      })
    );
  },

  abrirDisputa(actor, id, motivo) {
    guard(actor, 'retiro.disputa');
    const m = needMotivo(motivo);
    const r = getReserva(id);
    if (!['pagada', 'entregada', 'vencida'].includes(r.estado)) {
      throw new Error('Solo se abre disputa sobre retiros pagados, entregados o vencidos.');
    }
    const next = {
      ...state,
      reservas: upd(state.reservas, id, (x) => ({
        ...x,
        estado: 'en_disputa',
        disputa: {
          estado: 'abierta',
          abierta_por: actor.nombre,
          abierta_en: new Date().toISOString(),
          motivo: m,
          evidencias: [],
        },
        eventos: [...x.eventos, evento(actor, 'Disputa abierta desde el panel.')],
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'abrir_disputa',
        entidad_tipo: 'reserva',
        entidad_id: id,
        entidad_nombre: `Reserva ${id}`,
        antes: r.estado,
        despues: 'en_disputa',
        motivo: m,
      })
    );
  },

  adjuntarEvidencia(actor, id, texto) {
    guard(actor, 'retiro.disputa');
    const m = needMotivo(texto);
    const r = getReserva(id);
    if (r.estado !== 'en_disputa') throw new Error('La reserva no tiene una disputa abierta.');
    const next = {
      ...state,
      reservas: upd(state.reservas, id, (x) => ({
        ...x,
        disputa: {
          ...x.disputa,
          evidencias: [...x.disputa.evidencias, { ts: new Date().toISOString(), autor: actor.nombre, texto: m }],
        },
        eventos: [...x.eventos, evento(actor, 'Evidencia adjuntada a la disputa.')],
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'adjuntar_evidencia',
        entidad_tipo: 'reserva',
        entidad_id: id,
        entidad_nombre: `Reserva ${id}`,
        antes: '—',
        despues: 'Evidencia agregada',
        motivo: m,
      })
    );
  },

  resolverDisputa(actor, id, resolucion, motivo) {
    guard(actor, 'retiro.resolver_disputa');
    const m = needMotivo(motivo);
    const r = getReserva(id);
    if (r.estado !== 'en_disputa' || r.disputa?.estado !== 'abierta') {
      throw new Error('La reserva no tiene una disputa abierta.');
    }
    if (!['cliente', 'tendero'].includes(resolucion)) throw new Error('Resolución inválida.');
    // Solo cambia el estado: no mueve dinero.
    const nuevoEstado = resolucion === 'tendero' ? 'entregada' : 'cancelada';
    const next = {
      ...state,
      reservas: upd(state.reservas, id, (x) => ({
        ...x,
        estado: nuevoEstado,
        cancelada_motivo: resolucion === 'cliente' ? `Disputa resuelta a favor del cliente: ${m}` : x.cancelada_motivo,
        disputa: {
          ...x.disputa,
          estado: 'resuelta',
          resolucion,
          resolucion_motivo: m,
          resuelta_por: actor.nombre,
          resuelta_en: new Date().toISOString(),
        },
        eventos: [...x.eventos, evento(actor, `Disputa resuelta a favor del ${resolucion}.`)],
      })),
    };
    commit(
      addAudit(next, actor, {
        accion: 'resolver_disputa',
        entidad_tipo: 'reserva',
        entidad_id: id,
        entidad_nombre: `Reserva ${id}`,
        antes: 'en_disputa',
        despues: `${nuevoEstado} (a favor del ${resolucion})`,
        motivo: m,
      })
    );
    return { resolucion };
  },

  /* ---------- Alertas ---------- */

  resolverAlerta(actor, id, accion, motivo) {
    guard(actor, 'alerta.resolver');
    const m = needMotivo(motivo);
    const a = getAlerta(id);
    if (!['abierta', 'escalada'].includes(a.estado)) throw new Error('La alerta ya está cerrada.');

    if (accion === 'escalar') {
      if (a.estado === 'escalada') throw new Error('La alerta ya fue escalada.');
      const next = { ...state, alertas: upd(state.alertas, id, (x) => ({ ...x, estado: 'escalada', resolucion: `Escalada: ${m}` })) };
      commit(
        addAudit(next, actor, {
          accion: 'escalar_alerta',
          entidad_tipo: 'alerta',
          entidad_id: id,
          entidad_nombre: `Alerta ${id}`,
          antes: a.estado,
          despues: 'escalada',
          motivo: m,
        })
      );
      return {};
    }

    if (accion === 'descartar') {
      const next = { ...state, alertas: upd(state.alertas, id, (x) => ({ ...x, estado: 'descartada', resolucion: `Descartada: ${m}` })) };
      commit(
        addAudit(next, actor, {
          accion: 'resolver_alerta',
          entidad_tipo: 'alerta',
          entidad_id: id,
          entidad_nombre: `Alerta ${id}`,
          antes: a.estado,
          despues: 'descartada',
          motivo: m,
        })
      );
      return {};
    }

    if (accion === 'bloquear') {
      let s = state;
      let resultado;
      if (a.persona_id) {
        const p = getPersona(a.persona_id);
        if (p.estado_registro !== 'aprobada') throw new Error('Solo se puede bloquear a una persona aprobada.');
        s = setPersonaEstado(s, actor, p, 'bloqueada', m, 'bloquear');
        resultado = { notificacion: NOTIF.bloqueada, objetivo: p.nombre };
      } else {
        const t = getTienda(a.tienda_id);
        if (t.estado === 'suspendida') throw new Error('La tienda ya está suspendida.');
        s = setTiendaEstado(s, actor, t, 'suspendida', m, 'suspender', true);
        resultado = { objetivo: t.nombre };
      }
      s = {
        ...s,
        alertas: upd(s.alertas, id, (x) => ({
          ...x,
          estado: 'bloqueada',
          resolucion: `${a.persona_id ? 'Persona bloqueada' : 'Tienda suspendida por riesgo'}: ${m}`,
        })),
      };
      commit(
        addAudit(s, actor, {
          accion: 'resolver_alerta',
          entidad_tipo: 'alerta',
          entidad_id: id,
          entidad_nombre: `Alerta ${id}`,
          antes: a.estado,
          despues: 'bloqueada',
          motivo: m,
        })
      );
      return resultado;
    }
    throw new Error('Acción no válida.');
  },

  marcarUiaf(actor, id, motivo) {
    guard(actor, 'alerta.resolver');
    const m = needMotivo(motivo);
    const a = getAlerta(id);
    const marcar = !a.uiaf;
    const next = { ...state, alertas: upd(state.alertas, id, (x) => ({ ...x, uiaf: marcar })) };
    commit(
      addAudit(next, actor, {
        accion: marcar ? 'marcar_uiaf' : 'desmarcar_uiaf',
        entidad_tipo: 'alerta',
        entidad_id: id,
        entidad_nombre: `Alerta ${id}`,
        antes: marcar ? 'sin marcar' : 'marcada para reporte UIAF',
        despues: marcar ? 'marcada para reporte UIAF' : 'sin marcar',
        motivo: m,
      })
    );
    return { marcada: marcar };
  },

  /* ---------- Cuatro ojos ---------- */

  decidirAprobacion(actor, id, decision, motivo) {
    guard(actor, 'aprobacion.decidir');
    const m = needMotivo(motivo);
    const ap = state.aprobaciones.find((x) => x.id === id);
    if (!ap) throw new Error('Solicitud no encontrada.');
    if (ap.estado !== 'pendiente') throw new Error('La solicitud ya fue resuelta.');
    if (ap.firmas.some((f) => f.usuario === actor.username)) {
      throw new Error('Ya firmaste esta solicitud. La regla de cuatro ojos exige a otra persona.');
    }
    const firma = { usuario: actor.username, nombre: actor.nombre, ts: new Date().toISOString(), decision, motivo: m };

    if (decision === 'rechazar') {
      const next = {
        ...state,
        aprobaciones: upd(state.aprobaciones, id, (x) => ({ ...x, estado: 'rechazada', firmas: [...x.firmas, firma] })),
      };
      commit(
        addAudit(next, actor, {
          accion: 'rechazar_aprobacion',
          entidad_tipo: ap.entidad.tipo,
          entidad_id: ap.entidad.id,
          entidad_nombre: ap.entidad.nombre,
          antes: `${TIPO_APROBACION[ap.tipo]} · 1 de 2 firmas`,
          despues: 'solicitud rechazada',
          motivo: m,
        })
      );
      return { ejecutada: false };
    }

    let s = {
      ...state,
      aprobaciones: upd(state.aprobaciones, id, (x) => ({ ...x, estado: 'aprobada', firmas: [...x.firmas, firma] })),
    };
    if (ap.tipo === 'desbloqueo_persona') {
      const p = s.personas.find((x) => x.id === ap.entidad.id);
      s = setPersonaEstado(s, actor, p, 'aprobada', m, 'desbloquear', `${ap.firmas[0].nombre} + ${actor.nombre} (cuatro ojos)`);
    } else if (ap.tipo === 'desbloqueo_tienda') {
      const t = s.tiendas.find((x) => x.id === ap.entidad.id);
      s = setTiendaEstado(s, actor, t, 'activa', m, 'activar');
    } else if (ap.tipo === 'nivel_aliado_tienda') {
      const t = s.tiendas.find((x) => x.id === ap.entidad.id);
      s = {
        ...s,
        tiendas: upd(s.tiendas, t.id, (x) => ({ ...x, nivel: 'aliado', tope_retiro_cop: s.config.topes.aliado.retiro })),
      };
      s = addAudit(s, actor, {
        accion: 'cambiar_nivel',
        entidad_tipo: 'tienda',
        entidad_id: t.id,
        entidad_nombre: t.nombre,
        antes: t.nivel,
        despues: 'aliado',
        motivo: m,
      });
    }
    s = addAudit(s, actor, {
      accion: 'aprobar_aprobacion',
      entidad_tipo: ap.entidad.tipo,
      entidad_id: ap.entidad.id,
      entidad_nombre: ap.entidad.nombre,
      antes: `${TIPO_APROBACION[ap.tipo]} · 1 de 2 firmas`,
      despues: '2 de 2 firmas · ejecutada',
      motivo: m,
    });
    commit(s);
    return { ejecutada: true };
  },

  /* ---------- Configuración y emergencia ---------- */

  guardarConfig(actor, nueva, motivo) {
    guard(actor, 'config.editar');
    const m = needMotivo(motivo);
    const flat = (obj, prefix = '') =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]
      );
    const current = Object.fromEntries(flat({ topes: state.config.topes, umbrales: state.config.umbrales, reglas: state.config.reglas }));
    const incoming = Object.fromEntries(
      flat({ topes: nueva.topes, umbrales: nueva.umbrales, reglas: nueva.reglas })
    );
    const changes = Object.keys(incoming).filter((k) => Number(incoming[k]) !== Number(current[k]));
    if (!changes.length) throw new Error('No hay cambios para guardar.');
    changes.forEach((k) => {
      const v = Number(incoming[k]);
      if (!Number.isFinite(v) || v <= 0) throw new Error(`Valor inválido en «${CONFIG_LABELS[k] || k}».`);
      if (k === 'umbrales.diditScore' && v > 1) throw new Error('El score de Didit debe estar entre 0 y 1.');
    });
    const anterior = { ...state.config.anterior };
    const cfg = clone({
      topes: state.config.topes,
      umbrales: state.config.umbrales,
      reglas: state.config.reglas,
    });
    changes.forEach((k) => {
      anterior[k] = current[k];
    });
    const setPath = (obj, path, val) => {
      const keys = path.split('.');
      let o = obj;
      keys.slice(0, -1).forEach((key) => {
        o = o[key];
      });
      o[keys[keys.length - 1]] = val;
    };
    changes.forEach((k) => setPath(cfg, k, Number(incoming[k])));
    const next = { ...state, config: { ...state.config, ...cfg, anterior } };
    commit(
      addAudit(next, actor, {
        accion: 'configurar',
        entidad_tipo: 'configuracion',
        entidad_id: changes.join(', '),
        entidad_nombre: `${changes.length} ${changes.length === 1 ? 'parámetro' : 'parámetros'}`,
        antes: changes.map((k) => `${CONFIG_LABELS[k] || k}: ${current[k]}`).join('\n'),
        despues: changes.map((k) => `${CONFIG_LABELS[k] || k}: ${incoming[k]}`).join('\n'),
        motivo: m,
      })
    );
    return { cambios: changes.length };
  },

  setEmergencia(actor, activa, motivo) {
    guard(actor, 'emergencia.activar');
    const m = needMotivo(motivo);
    const cur = state.config.emergencia;
    if (cur.activa === activa) throw new Error(activa ? 'El interruptor ya está activo.' : 'El interruptor ya está desactivado.');
    const next = {
      ...state,
      config: {
        ...state.config,
        emergencia: activa
          ? { activa: true, desde: new Date().toISOString(), por: actor.nombre, motivo: m }
          : { activa: false, desde: null, por: null, motivo: null },
      },
    };
    commit(
      addAudit(next, actor, {
        accion: activa ? 'pausar_retiros' : 'reanudar_retiros',
        entidad_tipo: 'configuracion',
        entidad_id: 'emergencia',
        entidad_nombre: 'Interruptor de emergencia',
        antes: cur.activa ? 'retiros pausados' : 'servicio operativo',
        despues: activa ? 'retiros pausados' : 'servicio operativo',
        motivo: m,
      })
    );
  },
};
