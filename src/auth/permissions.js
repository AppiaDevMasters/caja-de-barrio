// Roles y permisos · z3312/panel-de-control-caja-de-barrio.md §2
export const ROLE_LABEL = {
  superadmin: 'Superadministrador',
  cumplimiento: 'Oficial de cumplimiento',
  soporte: 'Operador de soporte',
  aliado: 'Aliado (lectura)',
};

const RANK = { aliado: 0, soporte: 1, cumplimiento: 2, superadmin: 3 };

// Rango mínimo requerido por acción (mínimo privilegio).
const ACTION_MIN_RANK = {
  'persona.reintento': 1,
  'persona.aprobar': 2,
  'persona.rechazar': 2,
  'persona.bloquear': 2,
  'persona.desbloquear': 2,
  'persona.tope': 2,
  'persona.revelar': 2,
  'tienda.estado': 2,
  'tienda.nivel': 2,
  'tienda.tope': 2,
  'reserva.cancelar': 1,
  'retiro.disputa': 1,
  'alerta.resolver': 2,
  'alerta.exportar': 2,
  'aprobacion.decidir': 2,
  'config.editar': 3,
  'emergencia.activar': 3,
};

export const can = (rol, action) =>
  Boolean(rol) && RANK[rol] !== undefined && RANK[rol] >= (ACTION_MIN_RANK[action] ?? 99);

const ALL = ['superadmin', 'cumplimiento', 'soporte', 'aliado'];
const ROUTE_ACCESS = {
  inicio: ALL,
  personas: ['superadmin', 'cumplimiento', 'soporte'],
  tiendas: ALL,
  retiros: ['superadmin', 'cumplimiento', 'soporte'],
  alertas: ['superadmin', 'cumplimiento'],
  mapa: ['superadmin', 'cumplimiento'],
  auditoria: ['superadmin', 'cumplimiento'],
  configuracion: ['superadmin'],
};

export const canAccess = (rol, route) => (ROUTE_ACCESS[route] || []).includes(rol);
