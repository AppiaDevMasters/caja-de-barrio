/**
 * Punto de entrada de la capa de datos del panel. Las páginas importan de aquí.
 *
 *   REACT_APP_USE_MOCK=true  (por defecto) → fachada mock en memoria.
 *   REACT_APP_USE_MOCK=false               → escrituras y sesión contra `/admin/*` (backend Go).
 *
 * Las lecturas (selectores síncronos) siguen saliendo del store mock hasta que las páginas
 * pasen a consumir los `get*` de `real.js`; por eso las pantallas no cambian.
 */
import * as mock from './admin';
import * as real from './real';
import { setUnauthorizedHandler } from './http';

export const USE_MOCK = process.env.REACT_APP_USE_MOCK !== 'false';

export const admin = USE_MOCK ? mock.admin : real.admin;
export const authApi = USE_MOCK ? null : real.auth;
export { setUnauthorizedHandler };

// Actor del store mock (en modo real la identidad vive en la cookie del backend).
export const setActor = mock.setActor;

// Lecturas (selectores puros sobre el estado).
export const {
  selectResumen,
  selectPersonas,
  countPersonasPorEstado,
  selectTiendas,
  tiendasVisibles,
  efectivoLibre,
  alertaPendiente,
  selectReservas,
  selectSolicitudes,
  solicitudPendiente,
  semaforo,
  selectAlertas,
  exportRowsUiaf,
  selectAuditoria,
  selectAprobacionesPendientes,
} = mock;

// Lecturas asíncronas para el modo real.
export {
  getResumen,
  getPersonas,
  getPersona,
  getTiendas,
  getTienda,
  getRetiros,
  getRetiro,
  getSolicitudes,
  getSolicitud,
  getAlertas,
  getAlertasExport,
  getAprobaciones,
  getAuditoria,
  getConfiguracion,
} from './real';
