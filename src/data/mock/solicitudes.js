import { minutesAgo } from './time';
import { POLITICAS_VERSION } from './personas';

// Solicitudes de tendero (alta de tienda). Los `checks` los calcularía el backend
// (ok | alerta | error): el panel solo los pinta.
export const CHECK_LABEL = {
  cedula_valida: 'Cédula válida (Verifik)',
  face_match: 'Verificación facial (Didit)',
  wallet_resuelve: 'Wallet en Open Payments',
  ubicacion: 'Pin vs. dirección',
  duplicados: 'Duplicados',
  politicas: 'Políticas vigentes',
};

export const CAMPOS_CORRECCION = [
  { value: 'ubicacion', label: 'Ubicación (pin y dirección)' },
  { value: 'wallet', label: 'Wallet address' },
  { value: 'documento', label: 'Documento (cédula)' },
];

const SESSION = (ref) => `https://business.didit.me/sessions/${ref}`;
const hist = (min, actor, accion, motivo = null) => ({ ts: minutesAgo(min), actor, accion, motivo });

const sol = (s) => ({ tienda_id: null, correccion: null, decision: null, ...s });

export const SOLICITUDES = [
  sol({
    id: 'sol-101',
    estado: 'en_revision',
    creada_en: minutesAgo(130),
    solicitante: { nombre: 'Luz Marina Giraldo', cedula: '42.771.905', whatsapp: '+57 313 555 0142' },
    tienda: {
      nombre: 'Tienda Doña Luz',
      barrio: 'Aranjuez',
      direccion: 'Cll 93 #50-12, Aranjuez',
      lat: 6.2781,
      lon: -75.5591,
      efectivo_estimado_cop: 700000,
    },
    wallet: { address: '$ilp.interledger-test.dev/donaluz-demo', resuelve: true, moneda: 'COP' },
    verifik: { valida: true, nombre_coincide: true, nombre_registrado: 'LUZ MARINA GIRALDO PEREZ' },
    didit: { liveness: 'aprobada', score: 0.97, session_url: SESSION('s-7d10aa'), en: minutesAgo(118) },
    politicas: { version: POLITICAS_VERSION, aceptadas_en: minutesAgo(131) },
    checks: [
      { clave: 'cedula_valida', estado: 'ok', detalle: 'Verifik: nombre coincide.' },
      { clave: 'face_match', estado: 'ok', detalle: 'Didit 0,97.' },
      { clave: 'wallet_resuelve', estado: 'ok', detalle: 'COP, escala 2.' },
      { clave: 'ubicacion', estado: 'ok', detalle: 'El pin está a 40 m de la dirección.' },
      { clave: 'duplicados', estado: 'ok', detalle: 'Sin coincidencias de WhatsApp, cédula ni wallet.' },
      { clave: 'politicas', estado: 'ok', detalle: POLITICAS_VERSION },
    ],
    historial: [
      hist(131, 'agente', 'solicitud_creada'),
      hist(118, 'agente', 'didit_aprobada'),
      hist(118, 'agente', 'en_revision'),
    ],
  }),
  sol({
    id: 'sol-102',
    estado: 'en_revision',
    creada_en: minutesAgo(1500),
    solicitante: { nombre: 'Pedro Nel Ruiz', cedula: '15.330.972', whatsapp: '+57 312 555 1190' },
    tienda: {
      nombre: 'Minimercado San Pedro',
      barrio: 'Aranjuez',
      direccion: 'Cll 91 #53-40, Aranjuez',
      lat: 6.2912,
      lon: -75.5493,
      efectivo_estimado_cop: 500000,
    },
    wallet: { address: '$ilp.interledger-test.dev/sanpedro-demo', resuelve: true, moneda: 'COP' },
    verifik: { valida: true, nombre_coincide: true, nombre_registrado: 'PEDRO NEL RUIZ' },
    didit: { liveness: 'aprobada', score: 0.83, session_url: SESSION('s-5a02cc'), en: minutesAgo(1488) },
    politicas: { version: POLITICAS_VERSION, aceptadas_en: minutesAgo(1502) },
    checks: [
      { clave: 'cedula_valida', estado: 'ok', detalle: 'Verifik: nombre coincide.' },
      { clave: 'face_match', estado: 'alerta', detalle: 'Didit 0,83: aprobó, pero queda cerca del umbral (0,80).' },
      { clave: 'wallet_resuelve', estado: 'ok', detalle: 'COP, escala 2.' },
      { clave: 'ubicacion', estado: 'alerta', detalle: 'El pin queda a 1,8 km de la dirección declarada.' },
      { clave: 'duplicados', estado: 'alerta', detalle: 'El WhatsApp ya está asociado a la persona Camila Torres Henao.' },
      { clave: 'politicas', estado: 'ok', detalle: POLITICAS_VERSION },
    ],
    historial: [
      hist(1502, 'agente', 'solicitud_creada'),
      hist(1488, 'agente', 'didit_aprobada'),
      hist(1488, 'agente', 'en_revision'),
    ],
  }),
  sol({
    id: 'sol-103',
    estado: 'correccion_pedida',
    creada_en: minutesAgo(2900),
    solicitante: { nombre: 'Ricardo Henao Vélez', cedula: '71.220.664', whatsapp: '+57 301 555 8810' },
    tienda: {
      nombre: 'Granero Los Hermanos',
      barrio: 'Moravia',
      direccion: 'Cll 80 #52-18, Moravia',
      lat: 6.2768,
      lon: -75.5659,
      efectivo_estimado_cop: 900000,
    },
    wallet: { address: '$ilp.interledger-test.dev/granero-hermanos', resuelve: false, moneda: null },
    verifik: { valida: true, nombre_coincide: true, nombre_registrado: 'RICARDO HENAO VELEZ' },
    didit: { liveness: 'aprobada', score: 0.94, session_url: SESSION('s-3e91d4'), en: minutesAgo(2880) },
    politicas: { version: POLITICAS_VERSION, aceptadas_en: minutesAgo(2902) },
    checks: [
      { clave: 'cedula_valida', estado: 'ok', detalle: 'Verifik: nombre coincide.' },
      { clave: 'face_match', estado: 'ok', detalle: 'Didit 0,94.' },
      { clave: 'wallet_resuelve', estado: 'error', detalle: 'La wallet no resuelve en Open Payments.' },
      { clave: 'ubicacion', estado: 'ok', detalle: 'El pin está a 60 m de la dirección.' },
      { clave: 'duplicados', estado: 'ok', detalle: 'Sin coincidencias.' },
      { clave: 'politicas', estado: 'ok', detalle: POLITICAS_VERSION },
    ],
    correccion: { campos: ['wallet'], motivo: 'La wallet address no responde. Pídele que la copie de nuevo desde su billetera.' },
    historial: [
      hist(2902, 'agente', 'solicitud_creada'),
      hist(2880, 'agente', 'didit_aprobada'),
      hist(2880, 'agente', 'en_revision'),
      hist(2700, 'Mateo Gil', 'pedir_correccion', 'La wallet address no responde. Pídele que la copie de nuevo desde su billetera.'),
    ],
  }),
  sol({
    id: 'sol-104',
    estado: 'verificando',
    creada_en: minutesAgo(9),
    solicitante: { nombre: 'Adriana Posada Cardona', cedula: '43.998.120', whatsapp: '+57 320 555 7741' },
    tienda: {
      nombre: 'Frutería La Cosecha',
      barrio: 'Sevilla',
      direccion: 'Cra 47 #85-20, Sevilla',
      lat: 6.2712,
      lon: -75.5631,
      efectivo_estimado_cop: 400000,
    },
    wallet: { address: '$ilp.interledger-test.dev/cosecha-demo', resuelve: true, moneda: 'COP' },
    verifik: { valida: true, nombre_coincide: true, nombre_registrado: 'ADRIANA POSADA CARDONA' },
    didit: { liveness: 'pendiente', score: null, session_url: SESSION('s-9b44f0'), en: null },
    politicas: { version: POLITICAS_VERSION, aceptadas_en: minutesAgo(10) },
    checks: [
      { clave: 'cedula_valida', estado: 'ok', detalle: 'Verifik: nombre coincide.' },
      { clave: 'face_match', estado: 'alerta', detalle: 'Esperando la verificación facial de la persona.' },
      { clave: 'wallet_resuelve', estado: 'ok', detalle: 'COP, escala 2.' },
      { clave: 'ubicacion', estado: 'ok', detalle: 'El pin está a 30 m de la dirección.' },
      { clave: 'duplicados', estado: 'ok', detalle: 'Sin coincidencias.' },
      { clave: 'politicas', estado: 'ok', detalle: POLITICAS_VERSION },
    ],
    historial: [hist(10, 'agente', 'solicitud_creada')],
  }),
  sol({
    id: 'sol-105',
    estado: 'rechazada',
    creada_en: minutesAgo(4300),
    solicitante: { nombre: 'Jhon Fredy Mazo', cedula: '1.036.440.902', whatsapp: '+57 316 555 3027' },
    tienda: {
      nombre: 'Tienda El Rincón',
      barrio: 'Campo Valdés',
      direccion: 'Cll 77 #44-90, Campo Valdés',
      lat: 6.2692,
      lon: -75.5569,
      efectivo_estimado_cop: 300000,
    },
    wallet: { address: '$ilp.interledger-test.dev/elrincon-demo', resuelve: true, moneda: 'COP' },
    verifik: { valida: true, nombre_coincide: false, nombre_registrado: 'JOHN FREDY MAZO LOPEZ' },
    didit: { liveness: 'fallida', score: 0.28, session_url: SESSION('s-2c70be'), en: minutesAgo(4285) },
    politicas: { version: POLITICAS_VERSION, aceptadas_en: minutesAgo(4302) },
    checks: [
      { clave: 'cedula_valida', estado: 'alerta', detalle: 'Verifik: el nombre no coincide.' },
      { clave: 'face_match', estado: 'error', detalle: 'Didit rechazó la cara (0,28).' },
      { clave: 'wallet_resuelve', estado: 'ok', detalle: 'COP, escala 2.' },
      { clave: 'ubicacion', estado: 'ok', detalle: 'El pin está a 55 m de la dirección.' },
      { clave: 'duplicados', estado: 'ok', detalle: 'Sin coincidencias.' },
      { clave: 'politicas', estado: 'ok', detalle: POLITICAS_VERSION },
    ],
    decision: { por: 'Sistema (Didit)', en: minutesAgo(4285), motivo: 'La verificación facial fue rechazada.' },
    historial: [
      hist(4302, 'agente', 'solicitud_creada'),
      hist(4285, 'agente', 'didit_rechazada'),
      hist(4285, 'agente', 'rechazada', 'La verificación facial fue rechazada.'),
    ],
  }),
];
