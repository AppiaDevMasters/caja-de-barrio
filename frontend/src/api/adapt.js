/**
 * Normaliza lo que responde el backend (`/admin/*`) a la forma que ya usan las páginas
 * (la del mock), rellenando con valores neutros lo que el backend aún no envía.
 * Contrato: z3312/panel-de-control-v3.md §3.
 */

// Las listas llegan como `{ personas: [...] }`, `{ tiendas: [...] }`, `{ items, total }` o un arreglo.
export const lista = (r, clave) => {
  if (Array.isArray(r)) return r;
  return r?.[clave] ?? r?.items ?? [];
};

const BILLETERA_VACIA = { wallet_address: null, saldo_cop: 0, movimientos: [] };

export function adaptBilletera(b, wallet, saldo) {
  return {
    ...BILLETERA_VACIA,
    wallet_address: wallet ?? null,
    saldo_cop: saldo ?? 0,
    ...(b || {}),
    movimientos: b?.movimientos ?? [],
  };
}

export function adaptPersona(p) {
  if (!p) return p;
  return {
    nivel: null,
    tope_retiro_cop: null,
    dispositivo: null,
    telefono_unico: null,
    motivo_revision: null,
    politicas_version: null,
    politicas_aceptadas_en: null,
    aprobaciones: [],
    historial: [],
    ...p,
    listas: { restrictivas: false, pep: false, detalle: null, ...(p.listas || {}) },
    verifik: { valida: null, nombre_coincide: null, nombre_registrado: null, error: null, ...(p.verifik || {}) },
    didit: { liveness: 'pendiente', score: null, session_id: null, en: null, ...(p.didit || {}) },
    didit_ref: p.didit_ref ?? p.didit?.session_id ?? null,
    wallet: p.wallet ?? p.billetera?.wallet_address ?? null,
    billetera: adaptBilletera(p.billetera, p.wallet, p.saldo_cop),
  };
}

export function adaptTienda(t) {
  if (!t) return t;
  return {
    barrio: '',
    direccion: '',
    lat: null,
    lon: null,
    nivel: 'basico',
    rut: false,
    redId: null,
    suspension_riesgo: false,
    ubicacion_verificada: false,
    wallet_ok: false,
    tope_retiro_cop: 0,
    efectivo_publicado_cop: 0,
    efectivo_reservado_cop: 0,
    reputacion: 0,
    entregas_completadas: 0,
    reclamos: 0,
    motivo_revision: null,
    historial: [],
    ...t,
    dueno: { nombre: '—', cedula: '', verificado: false, ...(t.dueno || {}) },
    didit: { liveness: 'pendiente', score: null, session_id: null, en: null, ...(t.didit || {}) },
    verifik: { valida: null, nombre_coincide: null, nombre_registrado: null, error: null, ...(t.verifik || {}) },
    billetera: adaptBilletera(t.billetera, t.wallet, t.saldo_cop),
  };
}

const primero = (...vs) => vs.find((v) => v !== undefined && v !== null);

// GET /admin/retiros y /admin/retiros/{id}. `timeline` y `eventos` llegan del backend tal cual;
// `remesa` y `disputa` llegan `null`; `comisiones` puede venir anidado.
export function adaptRetiro(r) {
  if (!r) return r;
  const com = r.comisiones || {};
  const timeline = r.timeline ?? [];
  const paso = (key) => timeline.find((s) => s.key === key)?.estado;
  const monto = Number(r.monto_cop || 0);
  const tendero = Number(primero(r.comision_tendero_cop, com.tendero_cop, com.tendero, com.comision_tendero_cop, 0));
  const plataforma = Number(primero(r.comision_plataforma_cop, com.plataforma_cop, com.plataforma, com.comision_plataforma_cop, 0));
  return {
    persona_id: null,
    tienda_id: null,
    vence_en: null,
    tasa_tendero: null,
    efectivo_libre_al_reservar_cop: null,
    ...r,
    monto_cop: monto,
    comision_tendero_cop: tendero,
    comision_plataforma_cop: plataforma,
    total_cop: Number(primero(r.total_cop, tendero || plataforma ? monto + tendero + plataforma : 0)),
    nombre_cliente: primero(r.nombre_cliente, r.nombre_persona),
    nombre_tienda: primero(r.nombre_tienda),
    cancelada_motivo: r.cancelada_motivo ?? null,
    remesa: r.remesa ?? null,
    disputa: r.disputa ?? null,
    open_payments: r.open_payments ?? null,
    timeline,
    eventos: (r.eventos ?? []).map((ev) => ({ ...ev, detalle: aTexto(ev.detalle), actor: aTexto(ev.actor) })),
    face_match_ok: r.face_match_ok ?? paso('identidad') === 'ok',
    riesgo_ok: r.riesgo_ok ?? paso('riesgo') === 'ok',
  };
}

// GET /admin/alertas → solo `abierta` y `resuelta`; `uiaf` siempre false por ahora.
export function adaptAlerta(a) {
  if (!a) return a;
  return {
    severidad: null,
    persona_id: null,
    tienda_id: null,
    reserva_id: null,
    ...a,
    nombre_persona: a.nombre_persona ?? null,
    nombre_tienda: a.nombre_tienda ?? null,
    resolucion: a.resolucion ?? null,
    bloqueable: false,
    uiaf: false,
  };
}

const aTexto = (v) => (v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v));

// GET /admin/auditoria → sin `rol`, `ip` ni `entidad_nombre`; `antes`/`despues` pueden ser objetos.
export function adaptAuditoria(a) {
  if (!a) return a;
  const detalle = typeof a.detalle === 'string' ? a.detalle : '';
  const entidadId = String(a.entidad_id ?? '');
  return {
    rol: null,
    ip: null,
    ...a,
    entidad_tipo: a.entidad_tipo ?? '',
    entidad_id: entidadId,
    entidad_nombre: a.entidad_nombre || detalle || entidadId,
    antes: aTexto(a.antes),
    despues: aTexto(a.despues),
    motivo: a.motivo ?? '',
  };
}

// GET /admin/saldos → [{ wallet_address, duenio: {tipo,id,nombre}, saldo_cop, ultimo_movimiento_en }]
export const adaptSaldos = (r) => lista(r, 'billeteras');
