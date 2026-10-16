import { cop, timeOnly } from '../../utils/format';
import { fakeId, minutesAgo, minutesFromNow } from './time';

const OP = 'https://ilp.interledger-test.dev';
const PLATAFORMA = 0.01; // 1 % fijo para Caja de Barrio
const MIN_TENDERO = 1000;

// Flujo v2: verificación Didit al empezar, cupo aprobado una vez, aprobación escribiendo
// APROBAR en el chat y doble confirmación (tendero y cliente).
export const STEP_DEFS = [
  { key: 'identidad', label: 'Verificación de identidad (Didit)' },
  { key: 'reserva', label: 'Reserva de efectivo' },
  { key: 'riesgo', label: 'Evaluación de riesgo' },
  { key: 'cobro', label: 'Cobros creados' },
  { key: 'cotizacion', label: 'Cotización' },
  { key: 'aprobacion', label: 'Aprobación en el chat' },
  { key: 'pago', label: 'Pago completado' },
  { key: 'entrega_tendero', label: 'Entrega confirmada por el tendero' },
  { key: 'recibido_cliente', label: 'Recibido confirmado por el cliente' },
];

// Comisión del tendero según su liquidez: 1 % a 3 %, mínimo $1.000.
export const tasaTendero = (libre) => {
  if (libre >= 1500000) return 0.01;
  if (libre >= 800000) return 0.015;
  if (libre >= 400000) return 0.02;
  return 0.03;
};

export function calcComisiones(monto, libre) {
  const tasa = tasaTendero(libre);
  const tendero = Math.max(MIN_TENDERO, Math.round(monto * tasa));
  const plataforma = Math.round(monto * PLATAFORMA);
  return {
    tasa_tendero: tasa,
    comision_tendero_cop: tendero,
    comision_plataforma_cop: plataforma,
    total_cop: monto + tendero + plataforma,
  };
}

const pct = (n) => `${(n * 100).toString().replace('.', ',')} %`;
const dec = (n) => n.toFixed(2).replace('.', ',');

/**
 * Línea de tiempo de un retiro. done = pasos completados; fail = { detalle } hace fallar el
 * paso siguiente y deja el resto como no ejecutado; rest = estado de lo que no corrió.
 */
function buildTimeline({ id, startedMin, done, fail, rest = 'pendiente', monto, libre, com, remesa, score }) {
  const step = Math.max(0.2, Math.min(2, startedMin / (done + 2)));
  const refs = {
    identidad: `did_${fakeId(id, 'd').slice(0, 8)}`,
    reserva: id,
    riesgo: null,
    cobro: `${OP}/incoming-payments/${fakeId(id, 'i')}`,
    cotizacion: `${OP}/quotes/${fakeId(id, 'q')}`,
    aprobacion: `apr_${fakeId(id, 'a').slice(0, 4)}`,
    pago: `${OP}/outgoing-payments/${fakeId(id, 'o')}`,
    entrega_tendero: null,
    recibido_cliente: null,
  };
  const detalles = (ts) => ({
    identidad: `Prueba de vida y face match aprobados. Score ${dec(score)}.`,
    reserva: `Efectivo libre de la tienda ${cop(libre)} → comisión del tendero ${pct(com.tasa_tendero)}.`,
    riesgo: 'Permitir.',
    cobro: `Tienda ${cop(monto + com.comision_tendero_cop)} · Caja de Barrio ${cop(com.comision_plataforma_cop)}.`,
    cotizacion: remesa
      ? `Débito USD ${dec(remesa.usd)} (tasa ${remesa.tasa.toLocaleString('es-CO')} COP/USD).`
      : `Débito ${cop(com.total_cop)} COP.`,
    aprobacion: `La persona escribió «APROBAR» a las ${timeOnly(ts)}.`,
    pago: 'Cobro de la tienda completado en Open Payments.',
    entrega_tendero: 'Código validado.',
    recibido_cliente: '«sí, ya me lo dieron»',
  });

  return STEP_DEFS.map((def, i) => {
    let estado;
    if (i < done) estado = 'ok';
    else if (i === done && fail) estado = 'fallido';
    else if (fail && i > done) estado = 'omitido';
    else if (i === done && rest === 'pendiente') estado = 'pendiente';
    else estado = rest === 'omitido' ? 'omitido' : 'pendiente';
    const ran = estado === 'ok' || estado === 'fallido';
    const ts = ran ? minutesAgo(Math.max(0, startedMin - i * step)) : null;
    const showRef = ran || (estado === 'pendiente' && i === done);
    return {
      ...def,
      estado,
      ts,
      ref: showRef ? refs[def.key] : null,
      detalle: estado === 'fallido' ? fail.detalle : estado === 'ok' ? detalles(ts)[def.key] : null,
    };
  });
}

const NOMBRES = { 'p-001': 'Laura', 'p-002': 'Rosa', 'p-010': 'Camila', 'p-011': 'Óscar' };

function buildEventos({ persona_id, monto_cop, estado, timeline, com, disputa }) {
  const ts = (key) => timeline.find((s) => s.key === key)?.ts;
  const ran = (key) => timeline.find((s) => s.key === key)?.estado === 'ok';
  const nombre = NOMBRES[persona_id] || 'La persona';
  const ev = [];
  if (ran('reserva')) {
    ev.push({
      ts: ts('reserva'),
      tipo: 'aviso_tendero',
      actor: 'agente',
      detalle: `${nombre} va por ${cop(monto_cop)}; comisión ${cop(com.comision_tendero_cop)}.`,
    });
  }
  if (ran('pago')) {
    ev.push({
      ts: ts('pago'),
      tipo: 'aviso_pago',
      actor: 'agente',
      detalle: `Pago completado: ya puedes entregar ${cop(monto_cop)}.`,
    });
  }
  if (ran('entrega_tendero')) {
    ev.push({ ts: ts('entrega_tendero'), tipo: 'entrega_tendero', actor: 'tendero', detalle: 'El tendero validó el código de entrega.' });
  }
  if (estado === 'en_disputa' && disputa) {
    ev.push({ ts: disputa.abierta_en, tipo: 'disputa_abierta', actor: 'cliente (chat)', detalle: 'El cliente dijo que no recibió el dinero completo.' });
  }
  if (estado === 'vencida') {
    ev.push({ ts: minutesAgo(1), tipo: 'vencimiento', actor: 'sistema', detalle: 'La reserva venció sin aprobación; se liberó el efectivo.' });
  }
  return ev.sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

function reserva(p) {
  const {
    id,
    tienda_id,
    persona_id,
    monto_cop,
    estado,
    startedMin,
    done,
    fail,
    libre,
    score = 0.94,
    remesa = null,
    cancelada_motivo = null,
    disputa = null,
    venceMin,
  } = p;
  const sinReserva = fail && done === 0; // Didit rechazó antes de reservar: no hay cobros
  const com = sinReserva
    ? { tasa_tendero: 0, comision_tendero_cop: 0, comision_plataforma_cop: 0, total_cop: 0 }
    : calcComisiones(monto_cop, libre);
  const remesaFull = remesa ? { ...remesa, usd: Number((com.total_cop / remesa.tasa).toFixed(2)) } : null;
  const timeline = buildTimeline({
    id,
    startedMin,
    done,
    fail,
    rest: p.rest,
    monto: monto_cop,
    libre,
    com,
    remesa: remesaFull,
    score,
  });
  return {
    id,
    tienda_id,
    persona_id,
    monto_cop,
    estado,
    ...com,
    efectivo_libre_al_reservar_cop: sinReserva ? null : libre,
    riesgo_ok: done >= 3,
    face_match_ok: done >= 1,
    creada_en: minutesAgo(startedMin),
    vence_en: minutesFromNow(venceMin ?? 15 - startedMin),
    remesa: remesaFull,
    disputa,
    cancelada_motivo,
    timeline,
    eventos: buildEventos({ persona_id, monto_cop, estado, timeline, com, disputa }),
  };
}

const REMESA_ROSA = { origen: 'Andrés Cardona (Miami)', tasa: 4000 };

export const RESERVAS = [
  reserva({ id: 'R-1052', tienda_id: 't-001', persona_id: 'p-001', monto_cop: 200000, estado: 'entregada', startedMin: 130, done: 9, libre: 800000, score: 0.97 }),
  reserva({ id: 'R-1053', tienda_id: 't-001', persona_id: 'p-002', monto_cop: 450000, estado: 'entregada', startedMin: 190, done: 9, libre: 1100000, remesa: REMESA_ROSA, score: 0.91 }),
  reserva({
    id: 'R-1054',
    tienda_id: 't-002',
    persona_id: 'p-001',
    monto_cop: 200000,
    estado: 'cancelada',
    startedMin: 80,
    done: 0,
    libre: 450000,
    cancelada_motivo: 'Didit rechazó la cara: no es la titular de la cuenta. No se creó reserva ni se ejecutó ningún pago.',
    fail: { detalle: 'Didit rechazó la cara (score 0,21). No se reservó efectivo, no se creó ningún cobro y no salió ningún billete.' },
  }),
  reserva({ id: 'R-1055', tienda_id: 't-003', persona_id: 'p-001', monto_cop: 80000, estado: 'entregada', startedMin: 55, done: 9, libre: 2500000 }),
  reserva({ id: 'R-1056', tienda_id: 't-004', persona_id: 'p-001', monto_cop: 80000, estado: 'entregada', startedMin: 35, done: 9, libre: 900000 }),
  reserva({ id: 'R-1057', tienda_id: 't-003', persona_id: 'p-001', monto_cop: 80000, estado: 'pagada', startedMin: 12, done: 7, libre: 2420000 }),
  reserva({ id: 'R-1058', tienda_id: 't-004', persona_id: 'p-002', monto_cop: 120000, estado: 'reservada', startedMin: 6, done: 5, libre: 900000 }),
  reserva({ id: 'R-1059', tienda_id: 't-001', persona_id: 'p-011', monto_cop: 120000, estado: 'reservada', startedMin: 3, done: 3, libre: 800000 }),
  reserva({
    id: 'R-1060',
    tienda_id: 't-002',
    persona_id: 'p-010',
    monto_cop: 90000,
    estado: 'en_disputa',
    startedMin: 260,
    done: 8,
    libre: 450000,
    score: 0.88,
    fail: { detalle: 'El cliente respondió «no, me entregaron $70.000». La reserva pasó a en_disputa.' },
    disputa: {
      estado: 'abierta',
      abierta_por: 'Cliente (por el chat)',
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
    startedMin: 300,
    done: 5,
    libre: 450000,
    fail: { detalle: 'La persona no escribió «APROBAR» antes del vencimiento (15 min).' },
  }),
  reserva({
    id: 'R-1062',
    tienda_id: 't-005',
    persona_id: 'p-002',
    monto_cop: 100000,
    estado: 'cancelada',
    startedMin: 420,
    done: 4,
    libre: 300000,
    cancelada_motivo: 'La tienda fue suspendida por riesgo antes de recibir el pago.',
    fail: { detalle: 'La tienda fue suspendida por riesgo: no se pudo cotizar el pago.' },
  }),
  reserva({ id: 'R-1063', tienda_id: 't-003', persona_id: 'p-011', monto_cop: 150000, estado: 'entregada', startedMin: 310, done: 9, libre: 2500000, score: 0.96 }),
  reserva({ id: 'R-1064', tienda_id: 't-004', persona_id: 'p-011', monto_cop: 250000, estado: 'entregada', startedMin: 240, done: 9, libre: 900000, score: 0.95 }),
];
