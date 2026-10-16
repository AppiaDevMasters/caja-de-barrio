export const CONFIG_INICIAL = {
  topes: {
    basico: { retiro: 200000, dia: 400000, mes: 2000000 },
    comercio: { retiro: 500000, dia: 1500000, mes: 8000000 },
    aliado: { retiro: 1000000, dia: 4000000, mes: 20000000 },
  },
  umbrales: {
    diditScore: 0.8,
    radioBusquedaM: 1500,
    vencimientoReservaMin: 15,
  },
  reglas: {
    pitufeoRetiros: 3,
    pitufeoVentanaMin: 60,
    dispositivoCuentas: 2,
    cercaTopePct: 90,
    reclamosTienda: 3,
    reclamosDias: 7,
  },
  // Valores previos por campo (se llenan al guardar cambios).
  anterior: {},
  emergencia: { activa: false, desde: null, por: null, motivo: null },
};

// Tope máximo por nivel de persona (ajuste de tope "dentro de los límites del nivel").
export const TOPE_MAX_PERSONA = { 'Nivel 1': 300000, 'Nivel 2': 500000 };

export const CONFIG_LABELS = {
  'topes.basico.retiro': 'Tope por retiro · Básico',
  'topes.basico.dia': 'Tope por día · Básico',
  'topes.basico.mes': 'Tope por mes · Básico',
  'topes.comercio.retiro': 'Tope por retiro · Comercio',
  'topes.comercio.dia': 'Tope por día · Comercio',
  'topes.comercio.mes': 'Tope por mes · Comercio',
  'topes.aliado.retiro': 'Tope por retiro · Aliado',
  'topes.aliado.dia': 'Tope por día · Aliado',
  'topes.aliado.mes': 'Tope por mes · Aliado',
  'umbrales.diditScore': 'Score mínimo de Didit',
  'umbrales.radioBusquedaM': 'Radio de búsqueda (m)',
  'umbrales.vencimientoReservaMin': 'Vencimiento de reserva (min)',
  'reglas.pitufeoRetiros': 'Pitufeo · retiros que disparan alerta',
  'reglas.pitufeoVentanaMin': 'Pitufeo · ventana (min)',
  'reglas.dispositivoCuentas': 'Dispositivo compartido · cuentas máximas',
  'reglas.cercaTopePct': 'Cerca del tope · porcentaje',
  'reglas.reclamosTienda': 'Reclamos contra tienda · cantidad',
  'reglas.reclamosDias': 'Reclamos contra tienda · días',
};
