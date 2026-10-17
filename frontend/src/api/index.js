/**
 * Punto de entrada de la capa de datos del panel. Las páginas importan de aquí.
 *
 *   REACT_APP_USE_MOCK=true  → fachada mock en memoria (QA sin backend).
 *   REACT_APP_USE_MOCK=false → sesión, escrituras y lecturas migradas contra `/admin/*` (backend Go).
 *
 * Lecturas asíncronas (`get*`) + `useAdminQuery`: Inicio, Personas, Tiendas, Saldos, Retiros, Alertas y
 * Auditoría (z3312/panel-de-control-v3.md §4). Solicitudes, aprobaciones y configuración siguen en el store mock.
 */
import * as mock from './admin';
import * as real from './real';
import { getState } from '../data/mockStore';
import { invalidate } from './useAdminQuery';
import { setUnauthorizedHandler } from './http';

export const USE_MOCK = process.env.REACT_APP_USE_MOCK !== 'false';

// Toda escritura exitosa refresca las consultas montadas (revelar dato solo audita, no cambia lo que se ve).
const SIN_REFRESCO = new Set(['revelarDato']);
const base = USE_MOCK ? mock.admin : real.admin;
export const admin = Object.fromEntries(
  Object.entries(base).map(([nombre, fn]) => [
    nombre,
    SIN_REFRESCO.has(nombre)
      ? fn
      : async (...args) => {
          const resultado = await fn(...args);
          invalidate();
          return resultado;
        },
  ])
);

export const authApi = USE_MOCK ? null : real.auth;
export { setUnauthorizedHandler };
export { useAdminQuery, invalidate } from './useAdminQuery';

// Actor del store mock (en modo real la identidad vive en la cookie del backend).
export const setActor = mock.setActor;

// Lecturas síncronas (selectores puros sobre el store mock).
export const {
  selectResumen,
  selectPersonas,
  countPersonasPorEstado,
  contarPersonasPorEstado,
  filtrarPersonas,
  selectTiendas,
  filtrarTiendas,
  tiendasVisibles,
  efectivoLibre,
  alertaPendiente,
  selectReservas,
  filtrarRetiros,
  selectSolicitudes,
  solicitudPendiente,
  semaforo,
  selectAlertas,
  filtrarAlertas,
  exportRowsUiaf,
  selectAuditoria,
  filtrarAuditoria,
  selectAprobacionesPendientes,
} = mock;

/* ---------- Lecturas asíncronas: mock con latencia simulada o backend real ---------- */

const LATENCIA_MOCK = 150;
const tras = (fn) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      }
    }, LATENCIA_MOCK);
  });

const noEncontrada = (que) => {
  const err = new Error(`${que} no encontrada.`);
  err.status = 404;
  return err;
};

// El mock devuelve una copia para que los cambios del store no muten datos ya entregados.
const copia = (v) => JSON.parse(JSON.stringify(v));

export const getPersonas = USE_MOCK ? () => tras(() => copia(getState().personas)) : () => real.getPersonas();

export const getPersona = USE_MOCK
  ? (id) =>
      tras(() => {
        const p = getState().personas.find((x) => x.id === id);
        if (!p) throw noEncontrada('Persona');
        return copia(p);
      })
  : (id) => real.getPersona(id);

// `user` solo importa en mock (el aliado ve su red); en real el backend decide qué devolver.
export const getTiendas = USE_MOCK ? (user) => tras(() => copia(mock.tiendasVisibles(getState(), user))) : () => real.getTiendas();

export const getTienda = USE_MOCK
  ? (id) =>
      tras(() => {
        const t = getState().tiendas.find((x) => x.id === id);
        if (!t) throw noEncontrada('Tienda');
        return copia(t);
      })
  : (id) => real.getTienda(id);

export const getSaldos = USE_MOCK ? () => tras(() => mock.selectSaldos(getState())) : () => real.getSaldos();

// `user` solo importa en mock (el aliado ve otros KPIs); en real el backend decide por el rol de la sesión.
export const getResumen = USE_MOCK ? (user) => tras(() => copia(mock.selectResumen(getState(), user))) : () => real.getResumen();

export const getRetiros = USE_MOCK
  ? () => tras(() => copia(getState().reservas.map((r) => mock.reservaConNombres(getState(), r))))
  : (f) => real.getRetiros(f);

export const getRetiro = USE_MOCK
  ? (id) =>
      tras(() => {
        const r = getState().reservas.find((x) => x.id === id);
        if (!r) throw noEncontrada('Reserva');
        return copia(mock.reservaConNombres(getState(), r));
      })
  : (id) => real.getRetiro(id);

// El panel pide todas las alertas y filtra en memoria (pendientes / cerradas / todas).
export const getAlertas = USE_MOCK
  ? () => tras(() => copia(getState().alertas.map((a) => mock.alertaConNombres(getState(), a))))
  : () => real.getAlertas({ estado: 'todas' });

export const getAuditoria = USE_MOCK ? () => tras(() => copia(getState().auditoria)) : (f) => real.getAuditoria(f);

// Lecturas del resto de módulos (aún sin páginas migradas; el backend no las tiene).
export { getSolicitudes, getSolicitud, getAlertasExport, getAprobaciones, getConfiguracion } from './real';
