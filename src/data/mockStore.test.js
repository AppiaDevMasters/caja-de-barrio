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
