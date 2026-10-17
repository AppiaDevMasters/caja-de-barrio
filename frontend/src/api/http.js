/**
 * Cliente HTTP del panel. Todas las llamadas van a `/admin/*` del backend (Go) con la
 * sesión en cookie httpOnly (`credentials: 'include'`). El panel nunca toca Open Payments,
 * Didit ni Verifik. Contrato de errores: { error: { codigo, mensaje } }.
 *   401 → sesión vencida (se avisa para volver al login) · 403 → sin permiso · 409 → conflicto de negocio.
 */
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, codigo, mensaje) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
  }
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const qs = (params) => {
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'todas' && v !== 'todos');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

async function request(method, path, { body, params } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}${qs(params)}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'sin_conexion', 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    const fallback = {
      401: 'Tu sesión venció. Inicia sesión de nuevo.',
      403: 'Tu rol no tiene permiso para esta acción.',
      409: 'La acción entra en conflicto con el estado actual.',
    }[res.status];
    throw new ApiError(res.status, err.codigo || `http_${res.status}`, err.mensaje || fallback || 'No se pudo completar la acción.');
  }
  return data;
}

export const http = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body: body || {} }),
  put: (path, body) => request('PUT', path, { body: body || {} }),
};
