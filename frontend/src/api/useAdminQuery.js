import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lecturas asíncronas del panel con refresco tras cada escritura.
 *
 *   const { data, loading, error, refetch } = useAdminQuery('personas', () => getPersonas());
 *
 * - `clave` identifica la consulta y debe incluir sus parámetros (p. ej. `persona:${id}`).
 * - `invalidate(prefijo)` vuelve a pedir todas las consultas montadas cuya clave empiece por el prefijo
 *   (sin prefijo, todas). `admin.*` lo llama solo después de cada escritura exitosa.
 * - Al refrescar se conservan los datos anteriores: no hay parpadeo de skeleton.
 */
const registro = new Map(); // clave -> Set<refetch>

export function invalidate(prefijo = '') {
  registro.forEach((fns, clave) => {
    if (clave.startsWith(prefijo)) fns.forEach((fn) => fn());
  });
}

export function useAdminQuery(clave, fn) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const turno = useRef(0);

  const ejecutar = useCallback(async () => {
    const mio = (turno.current += 1);
    setEstado((s) => ({ ...s, loading: s.data === null, error: null }));
    try {
      const data = await fnRef.current();
      if (mio === turno.current) setEstado({ data, loading: false, error: null });
    } catch (error) {
      if (mio === turno.current) setEstado((s) => ({ data: s.data, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    setEstado({ data: null, loading: true, error: null });
    ejecutar();
    const fns = registro.get(clave) || new Set();
    fns.add(ejecutar);
    registro.set(clave, fns);
    return () => {
      turno.current += 1; // descarta respuestas de una consulta que ya no está montada
      fns.delete(ejecutar);
      if (!fns.size) registro.delete(clave);
    };
  }, [clave, ejecutar]);

  return { ...estado, refetch: ejecutar };
}
