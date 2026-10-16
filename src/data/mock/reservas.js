import { fakeId, minutesAgo, minutesFromNow } from './time';

const OP = 'https://ilp.interledger-test.dev';

export const STEP_DEFS = [
  { key: 'reserva', label: 'Reserva de efectivo' },
  { key: 'riesgo', label: 'Evaluación de riesgo' },
  { key: 'cobro', label: 'Cobro de la tienda' },
  { key: 'quote', label: 'Quote' },
  { key: 'grant', label: 'Aprobación del grant' },
  { key: 'facematch', label: 'Face match' },
  { key: 'pago', label: 'Pago completado' },
  { key: 'entrega', label: 'Entrega' },
];

/**
 * Construye la línea de tiempo Open Payments de un retiro.
 * done: pasos completados. fail: { detalle } hace fallar el paso siguiente.
 * rest: estado de los pasos que no se ejecutaron ('pendiente' | 'omitido').
 */
function buildTimeline({ id, startedMin, done, fail, rest = 'pendiente', monto, remesa, score = 0.94 }) {
  const comision = Math.round(monto * 0.01);
  const detalles = {
    reserva: `Efectivo reservado en la tienda por 15 min.`,
    riesgo: 'Decisión del agente de riesgo: permitir.',
    cobro: `Incoming payment creado por ${monto.toLocaleString('es-CO')} COP en la wallet de la tienda.`,
    quote: remesa
      ? `Débito USD ${remesa.usd.toFixed(2)} → ${monto.toLocaleString('es-CO')} COP (tasa ${remesa.tasa.toLocaleString('es-CO')}). Comisión USD ${remesa.comision.toFixed(2)}.`
      : `Débito ${(monto + comision).toLocaleString('es-CO')} COP · comisión ${comision.toLocaleString('es-CO')} COP.`,
    grant: 'Grant interactivo de outgoing-payment aprobado por la persona (limits.debitAmount = débito de la quote).',
    facematch: `Comparación facial en el mostrador (Didit). Score ${score}.`,
    pago: 'Outgoing payment ejecutado y cobro de la tienda verificado como completado.',
    entrega: 'Código de 4 dígitos validado; la tienda entregó los billetes.',
  };
  const refs = {
    reserva: id,
    riesgo: `riesgo/${fakeId(id, 'r').slice(0, 13)}`,
    cobro: `${OP}/incoming-payments/${fakeId(id, 'i')}`,
    quote: `${OP}/quotes/${fakeId(id, 'q')}`,
    grant: `${OP}/continue/${fakeId(id, 'g').slice(0, 18)}`,
    facematch: `didit-session/${fakeId(id, 'd').slice(0, 13)}`,
    pago: `${OP}/outgoing-payments/${fakeId(id, 'o')}`,
    entrega: `entrega/${id}`,
  };
  return STEP_DEFS.map((def, i) => {
    let estado;
    if (i < done) estado = 'ok';
    else if (i === done && fail) estado = 'fallido';
    else if (fail && i > done) estado = 'omitido';
    else if (i === done && rest === 'pendiente') estado = 'pendiente';
    else estado = rest === 'omitido' ? 'omitido' : 'pendiente';
    const ran = estado === 'ok' || estado === 'fallido';
    return {
      ...def,
      estado,
      ts: ran ? minutesAgo(startedMin - i * 2) : null,
      ref: ran || estado === 'pendiente' ? (estado === 'pendiente' && i > done ? null : refs[def.key]) : null,
      detalle: estado === 'fallido' ? fail.detalle : ran ? detalles[def.key] : null,
    };
  });
}

const reserva = (r) => ({ disputa: null, remesa: null, cancelada_motivo: null, ...r });

const REMESA_ROSA = { origen: 'Andrés Cardona (Miami)', usd: 112.5, tasa: 4000, comision: 1.5 };

export const RESERVAS = [
  reserva({
    id: 'R-1052',
    tienda_id: 't-001',
    persona_id: 'p-001',
    monto_cop: 200000,
    estado: 'entregada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(130),
    vence_en: minutesAgo(115),
    timeline: buildTimeline({ id: 'R-1052', startedMin: 130, done: 8, monto: 200000 }),
  }),
  reserva({
    id: 'R-1053',
    tienda_id: 't-001',
    persona_id: 'p-002',
    monto_cop: 450000,
    estado: 'entregada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(190),
    vence_en: minutesAgo(175),
    remesa: REMESA_ROSA,
    timeline: buildTimeline({ id: 'R-1053', startedMin: 190, done: 8, monto: 450000, remesa: REMESA_ROSA, score: 0.91 }),
  }),
  reserva({
    id: 'R-1054',
    tienda_id: 't-002',
    persona_id: 'p-001',
    monto_cop: 200000,
    estado: 'cancelada',
    riesgo_ok: true,
    face_match_ok: false,
    creada_en: minutesAgo(80),
    vence_en: minutesAgo(65),
    cancelada_motivo: 'Face match no coincide: la persona frente al mostrador no es la titular. No se ejecutó el pago.',
    timeline: buildTimeline({
      id: 'R-1054',
      startedMin: 80,
      done: 5,
      monto: 200000,
      fail: { detalle: 'Face match NO coincide (score 0.21). El pago no se ejecuta y no sale ningún billete.' },
    }),
  }),
  reserva({
    id: 'R-1055',
    tienda_id: 't-003',
    persona_id: 'p-001',
    monto_cop: 80000,
    estado: 'entregada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(55),
    vence_en: minutesAgo(40),
    timeline: buildTimeline({ id: 'R-1055', startedMin: 55, done: 8, monto: 80000 }),
  }),
  reserva({
    id: 'R-1056',
    tienda_id: 't-004',
    persona_id: 'p-001',
    monto_cop: 80000,
    estado: 'entregada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(35),
    vence_en: minutesAgo(20),
    timeline: buildTimeline({ id: 'R-1056', startedMin: 35, done: 8, monto: 80000 }),
  }),
  reserva({
    id: 'R-1057',
    tienda_id: 't-003',
    persona_id: 'p-001',
    monto_cop: 80000,
    estado: 'pagada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(12),
    vence_en: minutesFromNow(3),
    timeline: buildTimeline({ id: 'R-1057', startedMin: 12, done: 7, monto: 80000 }),
  }),
  reserva({
    id: 'R-1058',
    tienda_id: 't-004',
    persona_id: 'p-002',
    monto_cop: 120000,
    estado: 'reservada',
    riesgo_ok: true,
    face_match_ok: false,
    creada_en: minutesAgo(6),
    vence_en: minutesFromNow(9),
    timeline: buildTimeline({ id: 'R-1058', startedMin: 6, done: 4, monto: 120000 }),
  }),
  reserva({
    id: 'R-1059',
    tienda_id: 't-001',
    persona_id: 'p-011',
    monto_cop: 120000,
    estado: 'reservada',
    riesgo_ok: true,
    face_match_ok: false,
    creada_en: minutesAgo(3),
    vence_en: minutesFromNow(12),
    timeline: buildTimeline({ id: 'R-1059', startedMin: 3, done: 2, monto: 120000 }),
  }),
  reserva({
    id: 'R-1060',
    tienda_id: 't-002',
    persona_id: 'p-010',
    monto_cop: 90000,
    estado: 'en_disputa',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(260),
    vence_en: minutesAgo(245),
    timeline: buildTimeline({ id: 'R-1060', startedMin: 260, done: 8, monto: 90000, score: 0.88 }),
    disputa: {
      estado: 'abierta',
      abierta_por: 'Mateo Gil',
      abierta_en: minutesAgo(150),
      motivo: 'La persona reclama que recibió $70.000 en lugar de $90.000. La tienda lo niega.',
      evidencias: [
        {
          ts: minutesAgo(140),
          autor: 'Mateo Gil',
          texto: 'Llamada con la tienda: Doña Marleny asegura haber contado los billetes frente a la persona.',
        },
      ],
    },
  }),
  reserva({
    id: 'R-1061',
    tienda_id: 't-002',
    persona_id: 'p-010',
    monto_cop: 60000,
    estado: 'vencida',
    riesgo_ok: true,
    face_match_ok: false,
    creada_en: minutesAgo(300),
    vence_en: minutesAgo(285),
    timeline: buildTimeline({ id: 'R-1061', startedMin: 300, done: 4, monto: 60000, rest: 'omitido' }),
  }),
  reserva({
    id: 'R-1062',
    tienda_id: 't-005',
    persona_id: 'p-002',
    monto_cop: 100000,
    estado: 'cancelada',
    riesgo_ok: true,
    face_match_ok: false,
    creada_en: minutesAgo(420),
    vence_en: minutesAgo(405),
    cancelada_motivo: 'La tienda fue suspendida por riesgo antes de recibir el pago.',
    timeline: buildTimeline({ id: 'R-1062', startedMin: 420, done: 2, monto: 100000, rest: 'omitido' }),
  }),
  reserva({
    id: 'R-1063',
    tienda_id: 't-003',
    persona_id: 'p-011',
    monto_cop: 150000,
    estado: 'entregada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(310),
    vence_en: minutesAgo(295),
    timeline: buildTimeline({ id: 'R-1063', startedMin: 310, done: 8, monto: 150000, score: 0.96 }),
  }),
  reserva({
    id: 'R-1064',
    tienda_id: 't-004',
    persona_id: 'p-011',
    monto_cop: 250000,
    estado: 'entregada',
    riesgo_ok: true,
    face_match_ok: true,
    creada_en: minutesAgo(240),
    vence_en: minutesAgo(225),
    timeline: buildTimeline({ id: 'R-1064', startedMin: 240, done: 8, monto: 250000, score: 0.95 }),
  }),
];
