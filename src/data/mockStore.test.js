import { actions, getState, resetStore } from './mockStore';
import { can } from '../auth/permissions';
import { findByCredentials } from './mock/users';
import {
  selectSaldos,
  selectReservas,
  selectAlertas,
  selectAuditoria,
  filtrarPersonas,
  filtrarTiendas,
  filtrarRetiros,
  filtrarAlertas,
  filtrarAuditoria,
  reservaConNombres,
  alertaConNombres,
} from '../api/admin';
import { adaptAlerta, adaptAuditoria, adaptPersona, adaptRetiro, adaptTienda, lista } from '../api/adapt';

const actor = (username) => {
  const { password, ...u } = findByCredentials(username, {
    super: 'ofKx5deNiMROvOEx',
    cumplimiento: 'Cumple123!',
    soporte: 'Soporte123!',
  }[username]);
  return u;
};

beforeEach(() => resetStore());

const MOTIVO = 'Motivo de prueba suficientemente largo.';

test('el usuario principal de QA existe y es superadministrador', () => {
  expect(actor('super').rol).toBe('superadmin');
  expect(findByCredentials('super', 'incorrecta')).toBeUndefined();
});

test('toda acción exige un motivo escrito', () => {
  expect(() => actions.aprobarPersona(actor('cumplimiento'), 'p-003', 'corto')).toThrow(/motivo/i);
});

test('soporte no puede aprobar ni bloquear (mínimo privilegio)', () => {
  expect(can('soporte', 'persona.aprobar')).toBe(false);
  expect(() => actions.aprobarPersona(actor('soporte'), 'p-003', MOTIVO)).toThrow(/permiso/i);
  expect(() => actions.bloquearPersona(actor('soporte'), 'p-001', MOTIVO)).toThrow(/permiso/i);
});

test('aprobar deja estado, historial y auditoría', () => {
  const before = getState().auditoria.length;
  actions.aprobarPersona(actor('cumplimiento'), 'p-003', MOTIVO);
  const s = getState();
  expect(s.personas.find((p) => p.id === 'p-003').estado_registro).toBe('aprobada');
  expect(s.auditoria.length).toBe(before + 1);
  expect(s.auditoria[0]).toMatchObject({ accion: 'aprobar', actor: 'cumplimiento', motivo: MOTIVO });
});

test('cuatro ojos: el mismo usuario no puede dar la segunda firma', () => {
  const c = actor('cumplimiento');
  expect(() => actions.decidirAprobacion(c, 'AP-007', 'aprobar', MOTIVO)).toThrow(/cuatro ojos/i);
  actions.decidirAprobacion(actor('super'), 'AP-007', 'aprobar', MOTIVO);
  expect(getState().personas.find((p) => p.id === 'p-008').estado_registro).toBe('aprobada');
});

test('desbloquear exige solicitud y segunda firma', () => {
  actions.bloquearPersona(actor('cumplimiento'), 'p-001', MOTIVO);
  const r = actions.solicitarDesbloqueoPersona(actor('cumplimiento'), 'p-001', MOTIVO);
  expect(getState().personas.find((p) => p.id === 'p-001').estado_registro).toBe('bloqueada');
  actions.decidirAprobacion(actor('super'), r.aprobacion, 'aprobar', MOTIVO);
  expect(getState().personas.find((p) => p.id === 'p-001').estado_registro).toBe('aprobada');
});

test('subir tienda a Aliado requiere cuatro ojos', () => {
  const r = actions.cambiarNivelTienda(actor('cumplimiento'), 't-001', 'aliado', MOTIVO);
  expect(getState().tiendas.find((t) => t.id === 't-001').nivel).toBe('comercio');
  actions.decidirAprobacion(actor('super'), r.aprobacion, 'aprobar', MOTIVO);
  expect(getState().tiendas.find((t) => t.id === 't-001').nivel).toBe('aliado');
});

test('solo se cancelan reservas no pagadas y se libera el efectivo', () => {
  expect(() => actions.cancelarReserva(actor('soporte'), 'R-1057', MOTIVO)).toThrow(/pagada/i);
  const reservado = getState().tiendas.find((t) => t.id === 't-004').efectivo_reservado_cop;
  actions.cancelarReserva(actor('soporte'), 'R-1058', MOTIVO);
  expect(getState().reservas.find((r) => r.id === 'R-1058').estado).toBe('cancelada');
  expect(getState().tiendas.find((t) => t.id === 't-004').efectivo_reservado_cop).toBe(reservado - 120000);
});

test('escena de fraude: bloquear desde la alerta de pitufeo', () => {
  actions.resolverAlerta(actor('cumplimiento'), 'AL-0031', 'bloquear', MOTIVO);
  const s = getState();
  expect(s.alertas.find((a) => a.id === 'AL-0031').estado).toBe('bloqueada');
  expect(s.personas.find((p) => p.id === 'p-001').estado_registro).toBe('bloqueada');
});

test('solo el superadministrador activa la emergencia', () => {
  expect(() => actions.setEmergencia(actor('cumplimiento'), true, MOTIVO)).toThrow(/permiso/i);
  actions.setEmergencia(actor('super'), true, MOTIVO);
  expect(getState().config.emergencia.activa).toBe(true);
});

test('no existe ninguna acción para marcar pagos ni entregar sin face match', () => {
  const nombres = Object.keys(actions).join(' ').toLowerCase();
  expect(nombres).not.toMatch(/pagad|entregar|confirmarentrega|forzar/);
});

test('configuración guarda valor anterior y audita', () => {
  const nueva = JSON.parse(JSON.stringify(getState().config));
  nueva.umbrales.diditScore = 0.85;
  actions.guardarConfig(actor('super'), nueva, MOTIVO);
  const s = getState();
  expect(s.config.umbrales.diditScore).toBe(0.85);
  expect(s.config.anterior['umbrales.diditScore']).toBe(0.8);
  expect(s.auditoria[0].accion).toBe('configurar');
});

/* ---------- v2 ---------- */

test('el timeline tiene 9 pasos y las comisiones cuadran (ejemplo de la guía)', () => {
  const r = getState().reservas.find((x) => x.id === 'R-1052');
  expect(r.timeline.map((s) => s.key)).toEqual([
    'identidad',
    'reserva',
    'riesgo',
    'cobro',
    'cotizacion',
    'aprobacion',
    'pago',
    'entrega_tendero',
    'recibido_cliente',
  ]);
  expect(r).toMatchObject({
    tasa_tendero: 0.015,
    comision_tendero_cop: 3000,
    comision_plataforma_cop: 2000,
    total_cop: 205000,
    efectivo_libre_al_reservar_cop: 800000,
  });
});

test('la comisión del tendero respeta el mínimo de $1.000', () => {
  const r = getState().reservas.find((x) => x.id === 'R-1055'); // $80.000 con 1 % → mínimo
  expect(r.comision_tendero_cop).toBe(1000);
  expect(r.comision_plataforma_cop).toBe(800);
});

test('si Didit rechaza la cara no hay reserva ni cobros', () => {
  const r = getState().reservas.find((x) => x.id === 'R-1054');
  expect(r.timeline[0].estado).toBe('fallido');
  expect(r.timeline.slice(1).every((s) => s.estado === 'omitido')).toBe(true);
  expect(r.total_cop).toBe(0);
  expect(getState().alertas.find((a) => a.id === 'AL-0033')).toMatchObject({ regla: 'verificacion_facial_fallida', reserva_id: 'R-1054' });
});

test('resolver una disputa solo cambia el estado y audita (no mueve dinero)', () => {
  expect(() => actions.resolverDisputa(actor('soporte'), 'R-1060', 'cliente', MOTIVO)).toThrow(/permiso/i);
  expect(() => actions.resolverDisputa(actor('cumplimiento'), 'R-1060', 'otro', MOTIVO)).toThrow(/inválida/i);
  actions.resolverDisputa(actor('cumplimiento'), 'R-1060', 'cliente', MOTIVO);
  const s = getState();
  const r = s.reservas.find((x) => x.id === 'R-1060');
  expect(r.estado).toBe('cancelada');
  expect(r.disputa).toMatchObject({ estado: 'resuelta', resolucion: 'cliente' });
  expect(s.auditoria[0]).toMatchObject({ accion: 'resolver_disputa', entidad_id: 'R-1060' });
  expect(() => actions.resolverDisputa(actor('cumplimiento'), 'R-1060', 'tendero', MOTIVO)).toThrow(/disputa abierta/i);
});

test('la ficha de persona deriva políticas, cupo, vigencia y aprobaciones del chat', () => {
  const laura = getState().personas.find((p) => p.id === 'p-001');
  expect(laura.politicas_version).toBe('v1-2026-10');
  expect(laura.cupo_aprobado_cop).toBeGreaterThan(0);
  expect(laura.aprobaciones.length).toBeGreaterThan(0);
  expect(laura.aprobaciones[0].texto).toBe('APROBAR');
  expect(new Date(laura.verificacion_vigente_hasta) > new Date()).toBe(true);
  expect(getState().personas.find((p) => p.id === 'p-007').politicas_version).toBeNull();
});

test('solicitudes: aprobar crea la tienda activa, audita y solo cumplimiento puede', () => {
  expect(getState().tiendas.some((t) => t.id === 't-006')).toBe(false);
  expect(() => actions.aprobarSolicitud(actor('soporte'), 'sol-101', 'basico', MOTIVO)).toThrow(/permiso/i);
  expect(() => actions.aprobarSolicitud(actor('cumplimiento'), 'sol-101', 'aliado', MOTIVO)).toThrow(/cuatro ojos/i);
  const r = actions.aprobarSolicitud(actor('cumplimiento'), 'sol-101', 'basico', MOTIVO);
  const s = getState();
  const t = s.tiendas.find((x) => x.id === r.tienda_id);
  expect(t).toMatchObject({ estado: 'activa', nivel: 'basico', nombre: 'Tienda Doña Luz' });
  expect(s.solicitudes.find((x) => x.id === 'sol-101')).toMatchObject({ estado: 'aprobada', tienda_id: t.id });
  expect(s.auditoria[0]).toMatchObject({ accion: 'aprobar_solicitud', entidad_tipo: 'solicitud' });
  expect(r.notificacion).toMatch(/quedó activa/);
  expect(() => actions.aprobarSolicitud(actor('cumplimiento'), 'sol-101', 'basico', MOTIVO)).toThrow(/en revisión/i);
});

test('solicitudes: soporte pide corrección y con checks en rojo no se aprueba', () => {
  expect(() => actions.pedirCorreccionSolicitud(actor('soporte'), 'sol-102', [], MOTIVO)).toThrow(/al menos un dato/i);
  actions.pedirCorreccionSolicitud(actor('soporte'), 'sol-102', ['ubicacion'], MOTIVO);
  expect(getState().solicitudes.find((x) => x.id === 'sol-102')).toMatchObject({
    estado: 'correccion_pedida',
    correccion: { campos: ['ubicacion'] },
  });
  // sol-103 tiene la wallet en rojo y ya está en corrección: no se puede aprobar
  expect(() => actions.aprobarSolicitud(actor('cumplimiento'), 'sol-103', 'basico', MOTIVO)).toThrow(/en revisión/i);
});

test('solicitudes: rechazar exige motivo y rango de cumplimiento', () => {
  expect(can('soporte', 'solicitud.rechazar')).toBe(false);
  expect(can('soporte', 'solicitud.correccion')).toBe(true);
  expect(() => actions.rechazarSolicitud(actor('cumplimiento'), 'sol-102', 'corto')).toThrow(/motivo/i);
  actions.rechazarSolicitud(actor('cumplimiento'), 'sol-102', MOTIVO);
  expect(getState().solicitudes.find((x) => x.id === 'sol-102').estado).toBe('rechazada');
});

/* ---------- v3 ---------- */

const DATOS_TENDERO = {
  nombre_tienda: 'Tienda La Esperanza',
  direccion: 'Cra 50 #90-10, Aranjuez',
  lat: 6.277,
  lon: -75.56,
  nivel: 'basico',
  whatsapp_tendero: '573009990001',
  nombre_tendero: 'Mario Duque Soto',
  motivo: MOTIVO,
};

test('registrar tendero crea la tienda pendiente de verificación con billetera en cero y audita', () => {
  const r = actions.registrarTendero(actor('cumplimiento'), DATOS_TENDERO);
  const s = getState();
  const t = s.tiendas.find((x) => x.id === r.id);
  expect(t).toMatchObject({
    estado: 'pendiente_verificacion',
    nivel: 'basico',
    tendero_whatsapp: '573009990001',
    billetera: { saldo_cop: 0, movimientos: [] },
  });
  expect(t.billetera.wallet_address).toMatch(/^\$ilp\./);
  expect(s.auditoria[0]).toMatchObject({ accion: 'registrar_tendero', entidad_id: r.id });
  expect(r.notificacion).toMatch(/Mario/);
});

test('registrar tendero valida permiso, motivo, nivel, coordenadas y WhatsApp repetido', () => {
  expect(() => actions.registrarTendero(actor('soporte'), DATOS_TENDERO)).toThrow(/permiso/i);
  const c = actor('cumplimiento');
  expect(() => actions.registrarTendero(c, { ...DATOS_TENDERO, motivo: 'corto' })).toThrow(/motivo/i);
  expect(() => actions.registrarTendero(c, { ...DATOS_TENDERO, nivel: 'platino' })).toThrow(/nivel/i);
  expect(() => actions.registrarTendero(c, { ...DATOS_TENDERO, lat: 'x' })).toThrow(/latitud/i);
  actions.registrarTendero(c, DATOS_TENDERO);
  expect(() => actions.registrarTendero(c, DATOS_TENDERO)).toThrow(/ya es tendero/i);
});

test('activar a mano una tienda pendiente de verificación la deja activa', () => {
  const r = actions.registrarTendero(actor('cumplimiento'), DATOS_TENDERO);
  actions.activarTienda(actor('cumplimiento'), r.id, MOTIVO);
  expect(getState().tiendas.find((t) => t.id === r.id).estado).toBe('activa');
});

test('aprobar una persona en revisión crea la billetera y la carga inicial una sola vez', () => {
  expect(getState().personas.find((p) => p.id === 'p-003').billetera.saldo_cop).toBe(0);
  actions.aprobarPersona(actor('cumplimiento'), 'p-003', MOTIVO);
  const b = getState().personas.find((p) => p.id === 'p-003').billetera;
  expect(b.saldo_cop).toBe(1000000);
  expect(b.movimientos).toHaveLength(1);
  expect(b.movimientos[0]).toMatchObject({ tipo: 'carga_inicial', referencia: 'aprobacion:p-003' });
});

test('se puede aprobar o rechazar a quien sigue en verificando', () => {
  actions.aprobarPersona(actor('cumplimiento'), 'p-006', MOTIVO);
  expect(getState().personas.find((p) => p.id === 'p-006').estado_registro).toBe('aprobada');
  expect(() => actions.rechazarPersona(actor('cumplimiento'), 'p-001', MOTIVO)).toThrow(/revisión manual o verificando/i);
});

test('los saldos salen de las billeteras de personas y tiendas', () => {
  const filas = selectSaldos(getState());
  const laura = filas.find((f) => f.duenio.id === 'p-001');
  expect(laura).toMatchObject({ duenio: { tipo: 'persona' }, saldo_cop: 1000000 });
  expect(filas.find((f) => f.duenio.id === 't-001')).toMatchObject({ duenio: { tipo: 'tienda' }, saldo_cop: 0 });
  expect(filas.some((f) => f.duenio.id === 'p-007')).toBe(false); // sin billetera todavía
});

test('los adaptadores rellenan lo que el backend aún no envía', () => {
  expect(lista({ personas: [{ id: 'per_1' }] }, 'personas')).toHaveLength(1);
  expect(lista([{ id: 1 }, { id: 2 }], 'personas')).toHaveLength(2);
  expect(lista({ items: [{ id: 1 }], total: 1 }, 'personas')).toHaveLength(1);
  const p = adaptPersona({
    id: 'per_1',
    nombre: 'JUAN PEREZ',
    cedula: '****3456',
    estado_registro: 'revision_manual',
    didit: { liveness: 'aprobada', score: 0.97, session_id: 'did_1' },
    verifik: { valida: null, error: 'El registro civil no respondió (token vencido)' },
  });
  expect(p.didit_ref).toBe('did_1');
  expect(p.billetera).toMatchObject({ saldo_cop: 0, movimientos: [] });
  expect(p.historial).toEqual([]);
  const t = adaptTienda({ id: 'tie_1', nombre: 'X', estado: 'pendiente_verificacion' });
  expect(t.dueno.nombre).toBe('—');
  expect(t.billetera.movimientos).toEqual([]);
  // las listas del backend (cédula ya enmascarada) también se filtran sin romperse
  expect(filtrarPersonas([p], { estado: 'revision_manual', q: '3456' })).toHaveLength(1);
  expect(filtrarTiendas([t], { estado: 'pendiente_verificacion' })).toHaveLength(1);
});

/* ---------- v3: retiros, alertas y auditoría del backend real ---------- */

const STEPS_BACKEND = [
  { key: 'identidad', label: 'Identidad', estado: 'ok', ts: '2026-10-17T05:00:00Z', ref: 'did_1', detalle: null },
  { key: 'reserva', label: 'Reserva', estado: 'ok', ts: '2026-10-17T05:01:00Z', ref: 'R-1', detalle: null },
  { key: 'riesgo', label: 'Riesgo', estado: 'ok', ts: '2026-10-17T05:01:30Z', ref: null, detalle: null },
  { key: 'pago', label: 'Pago', estado: 'pendiente', ts: null, ref: null, detalle: null },
];

test('adaptRetiro conserva el timeline del backend y tolera remesa/disputa nulas', () => {
  const r = adaptRetiro({
    id: 'R-1',
    estado: 'pagada',
    nombre_tienda: 'Tienda de Magno',
    nombre_cliente: 'Cristian',
    monto_cop: 100000,
    comisiones: { tendero_cop: 3000, plataforma_cop: 1000 },
    timeline: STEPS_BACKEND,
    eventos: [{ tipo: 'aviso_pago', actor: 'agente', detalle: { ok: true } }],
    open_payments: { incoming_payment_url: 'https://ilp.test/incoming/1' },
    remesa: null,
    disputa: null,
  });
  expect(r.timeline).toBe(STEPS_BACKEND);
  expect(r).toMatchObject({ comision_tendero_cop: 3000, comision_plataforma_cop: 1000, total_cop: 104000, face_match_ok: true, riesgo_ok: true });
  expect(r.remesa).toBeNull();
  expect(r.disputa).toBeNull();
  expect(r.cancelada_motivo).toBeNull();
  expect(typeof r.eventos[0].detalle).toBe('string');
  // un detalle mínimo no rompe la ficha
  const minimo = adaptRetiro({ id: 'R-2', estado: 'cancelada' });
  expect(minimo).toMatchObject({ timeline: [], eventos: [], total_cop: 0, face_match_ok: false, open_payments: null });
});

test('retiros: el mock une nombres y el filtro funciona igual que con el backend', () => {
  const filas = getState().reservas.map((r) => reservaConNombres(getState(), r));
  expect(filas.every((r) => r.nombre_cliente && r.nombre_tienda)).toBe(true);
  expect(selectReservas(getState(), {})).toHaveLength(filas.length);
  const entregadas = filtrarRetiros(filas, { estado: 'entregada' });
  expect(entregadas.length).toBeGreaterThan(0);
  expect(entregadas.every((r) => r.estado === 'entregada')).toBe(true);
  const porNombre = filtrarRetiros(filas, { q: filas[0].nombre_cliente.split(' ')[0].toLowerCase() });
  expect(porNombre.length).toBeGreaterThan(0);
});

test('adaptAlerta solo maneja abierta/resuelta y apaga UIAF y bloqueo', () => {
  const a = adaptAlerta({ id: 'AL-1', regla: 'pitufeo', estado: 'resuelta', nombre_persona: 'Cristian', uiaf: true });
  expect(a).toMatchObject({ uiaf: false, bloqueable: false, severidad: null, persona_id: null, nombre_tienda: null });
  const abierta = adaptAlerta({ id: 'AL-2', regla: 'pitufeo', estado: 'abierta', creada_en: '2026-10-17T05:00:00Z' });
  expect(filtrarAlertas([a, abierta], { estado: 'pendientes' })).toHaveLength(1);
  expect(filtrarAlertas([a, abierta], { estado: 'cerradas' })).toHaveLength(1);
  expect(filtrarAlertas([a, abierta], { estado: 'todas' })).toHaveLength(2);
  expect(selectAlertas(getState(), { estado: 'todas' }).every((x) => 'nombre_persona' in x)).toBe(true);
  expect(alertaConNombres(getState(), getState().alertas[0])).toHaveProperty('bloqueable');
});

test('adaptAuditoria rellena registro, rol e IP que el backend no manda', () => {
  const a = adaptAuditoria({
    id: 'a1',
    ts: '2026-10-17T05:00:00Z',
    actor: 'cumplimiento',
    accion: 'aprobar_persona',
    entidad_tipo: 'persona',
    entidad_id: 'per_1',
    motivo: 'Verifik vencido, cédula revisada a mano.',
    antes: { estado: 'revision_manual' },
    despues: 'aprobada',
    detalle: 'Magno Duque',
  });
  expect(a).toMatchObject({ rol: null, ip: null, entidad_nombre: 'Magno Duque', despues: 'aprobada' });
  expect(typeof a.antes).toBe('string');
  const sinDetalle = adaptAuditoria({ id: 'a2', actor: 'super', accion: 'x', entidad_id: 7 });
  expect(sinDetalle).toMatchObject({ entidad_id: '7', entidad_nombre: '7', motivo: '', antes: '' });
  expect(filtrarAuditoria([a, sinDetalle], { actor: 'cumplimiento' })).toHaveLength(1);
  expect(filtrarAuditoria([a, sinDetalle], { q: 'magno' })).toHaveLength(1);
  expect(selectAuditoria(getState(), {})).toHaveLength(getState().auditoria.length);
});

test('la tienda inactiva del backend se filtra como suspendida', () => {
  const t = adaptTienda({ id: 'tie_9', nombre: 'Z', estado: 'inactiva' });
  expect(filtrarTiendas([t], { estado: 'suspendida' })).toHaveLength(1);
  expect(filtrarTiendas([t], { estado: 'activa' })).toHaveLength(0);
});
