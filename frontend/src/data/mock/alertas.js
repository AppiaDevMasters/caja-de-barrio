import { minutesAgo } from './time';

export const REGLAS_ALERTA = {
  pitufeo: 'Retiros fraccionados (pitufeo)',
  dispositivo_compartido: 'Dispositivo en varias cuentas',
  cerca_tope: 'Monto cerca del tope',
  lista_restrictiva: 'Coincidencia en listas',
  reclamos_tienda: 'Reclamos repetidos contra tienda',
  entrega_no_recibida: 'Entrega no recibida (disputa del cliente)',
  verificacion_facial_fallida: 'Verificación facial fallida al retirar',
};

const alerta = (a) => ({ uiaf: false, resolucion: null, ...a });

export const ALERTAS = [
  alerta({
    id: 'AL-0033',
    regla: 'verificacion_facial_fallida',
    persona_id: 'p-001',
    tienda_id: 't-002',
    reserva_id: 'R-1054',
    detalle:
      'Didit rechazó la cara al iniciar el retiro R-1054 (score 0,21). Posible suplantación: no se reservó efectivo ni se creó ningún cobro.',
    severidad: 'media',
    creada_en: minutesAgo(80),
    estado: 'abierta',
  }),
  alerta({
    id: 'AL-0032',
    regla: 'entrega_no_recibida',
    persona_id: 'p-010',
    tienda_id: 't-002',
    reserva_id: 'R-1060',
    detalle:
      'La persona dijo «no» en la confirmación de recibido: reclama $70.000 de $90.000 en R-1060. La reserva pasó a en_disputa y espera resolución.',
    severidad: 'alta',
    creada_en: minutesAgo(150),
    estado: 'abierta',
  }),
  alerta({
    id: 'AL-0031',
    regla: 'pitufeo',
    persona_id: 'p-001',
    tienda_id: null,
    detalle:
      '3 retiros pagados o entregados de la misma persona en 60 minutos (R-1055, R-1056, R-1057 · $80.000 c/u). La siguiente reserva queda bloqueada por regla MVP.',
    severidad: 'alta',
    creada_en: minutesAgo(8),
    estado: 'abierta',
  }),
  alerta({
    id: 'AL-0030',
    regla: 'dispositivo_compartido',
    persona_id: 'p-010',
    tienda_id: null,
    detalle:
      'El dispositivo dev-c901 está asociado a 4 cuentas: Camila Torres, Camilo Ortega, Daniela Múnera y Esteban Pineda.',
    severidad: 'alta',
    creada_en: minutesAgo(45),
    estado: 'abierta',
  }),
  alerta({
    id: 'AL-0029',
    regla: 'cerca_tope',
    persona_id: 'p-002',
    tienda_id: 't-001',
    detalle: 'Retiro de $450.000 sobre un tope de $500.000 (90 %). Origen: remesa en USD.',
    severidad: 'media',
    creada_en: minutesAgo(185),
    estado: 'abierta',
  }),
  alerta({
    id: 'AL-0028',
    regla: 'lista_restrictiva',
    persona_id: 'p-005',
    tienda_id: null,
    detalle: 'Coincidencia PEP en el módulo AML de Didit. El registro está en cola de revisión manual.',
    severidad: 'alta',
    creada_en: minutesAgo(1550),
    estado: 'escalada',
  }),
  alerta({
    id: 'AL-0027',
    regla: 'reclamos_tienda',
    persona_id: null,
    tienda_id: 't-005',
    detalle: '4 reclamos de personas en 7 días contra Tienda Doña Gloria por entregas incompletas.',
    severidad: 'media',
    creada_en: minutesAgo(2900),
    estado: 'bloqueada',
    resolucion: 'Tienda suspendida por riesgo. Requiere cuatro ojos para reactivarla.',
    uiaf: true,
  }),
  alerta({
    id: 'AL-0026',
    regla: 'cerca_tope',
    persona_id: 'p-011',
    tienda_id: 't-004',
    detalle: 'Retiro de $250.000 sobre un tope de $500.000 (50 %), dentro del patrón habitual de la persona.',
    severidad: 'baja',
    creada_en: minutesAgo(235),
    estado: 'descartada',
    resolucion: 'Descartada: monto coherente con su historial de retiros.',
  }),
];
