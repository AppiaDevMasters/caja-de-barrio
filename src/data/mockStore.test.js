import { actions, getState, resetStore } from './mockStore';
import { can } from '../auth/permissions';
import { findByCredentials } from './mock/users';

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
