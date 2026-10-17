import { minutesAgo } from './time';

const e = (n, min, actor, rol, accion, tipo, id, nombre, antes, despues, motivo, ip = '10.20.4.17') => ({
  id: `AUD-${String(n).padStart(4, '0')}`,
  ts: minutesAgo(min),
  actor,
  rol,
  ip,
  accion,
  entidad_tipo: tipo,
  entidad_id: id,
  entidad_nombre: nombre,
  antes,
  despues,
  motivo,
});

// Más reciente primero. Solo lectura: no existe API para editar ni borrar.
export const AUDITORIA = [
  e(11, 140, 'soporte', 'soporte', 'adjuntar_evidencia', 'reserva', 'R-1060', 'Reserva R-1060', '—', 'Nota de llamada con la tienda', 'Llamada con la tienda: la tendera asegura haber contado los billetes.', '10.20.4.52'),
  e(10, 300, 'cumplimiento', 'cumplimiento', 'solicitar_desbloqueo', 'persona', 'p-008', 'Hernán Cuartas Mejía', 'bloqueada', 'pendiente de segunda aprobación', 'Se verificó el origen de los fondos con el titular; se solicita desbloqueo.', '10.20.4.31'),
  e(9, 1400, 'cumplimiento', 'cumplimiento', 'bloquear', 'persona', 'p-008', 'Hernán Cuartas Mejía', 'aprobada', 'bloqueada', 'Retiros fraccionados repetidos que rozan el tope. Se bloquea mientras se revisa el caso.', '10.20.4.31'),
  e(8, 2850, 'cumplimiento', 'cumplimiento', 'resolver_alerta', 'alerta', 'AL-0027', 'Alerta AL-0027', 'abierta', 'bloqueada', 'Cuatro reclamos en siete días por entregas incompletas.', '10.20.4.31'),
  e(7, 2851, 'cumplimiento', 'cumplimiento', 'suspender', 'tienda', 't-005', 'Tienda Doña Gloria', 'activa', 'suspendida (riesgo)', 'Cuatro reclamos en siete días por entregas incompletas.', '10.20.4.31'),
  e(6, 2900, 'cumplimiento', 'cumplimiento', 'marcar_uiaf', 'alerta', 'AL-0027', 'Alerta AL-0027', 'sin marcar', 'marcada para reporte UIAF', 'Patrón reiterado; se marca para el reporte de la entidad aliada.', '10.20.4.31'),
  e(5, 4200, 'super', 'superadmin', 'configurar', 'configuracion', 'umbrales.diditScore', 'Umbral de Didit', '0.75', '0.80', 'Se endurece el umbral tras revisar falsos positivos de la semana.', '10.20.4.5'),
  e(4, 5600, 'cumplimiento', 'cumplimiento', 'rechazar', 'persona', 'p-009', 'Sofía Marín Giraldo', 'revision_manual', 'rechazada', 'Cédula no válida en Verifik y prueba de vida fallida.', '10.20.4.31'),
  e(3, 7200, 'cumplimiento', 'cumplimiento', 'cambiar_nivel', 'tienda', 't-001', 'Tienda Don Jaime', 'basico', 'comercio', 'RUT cargado y verificado en el registro mercantil.', '10.20.4.31'),
  e(2, 10100, 'soporte', 'soporte', 'cancelar_reserva', 'reserva', 'R-1049', 'Reserva R-1049', 'reservada', 'cancelada', 'La persona solicitó cancelar antes de aprobar el pago.', '10.20.4.52'),
  e(1, 12800, 'super', 'superadmin', 'configurar', 'configuracion', 'umbrales.vencimientoReservaMin', 'Vencimiento de reserva', '20', '15', 'Se acorta el vencimiento para liberar efectivo más rápido.', '10.20.4.5'),
];
