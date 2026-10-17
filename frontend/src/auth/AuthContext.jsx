import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findByCredentials, findByUsername, toPublicUser } from '../data/mock/users';
import { USE_MOCK, authApi, setActor, setUnauthorizedHandler } from '../api';

const KEY = 'cdb.session';
const AuthCtx = createContext(null);

function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    const found = raw && findByUsername(raw.username);
    return found ? toPublicUser(found) : null;
  } catch {
    return null;
  }
}

/**
 * Mock: sesión simulada en localStorage (solo el nombre de usuario, nunca la clave).
 * Real (REACT_APP_USE_MOCK=false): la sesión es un JWT en cookie httpOnly del backend;
 * aquí solo se guarda en memoria el usuario público que devuelve /admin/auth.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!USE_MOCK) return null;
    const u = readSession();
    setActor(u);
    return u;
  });
  const [ready, setReady] = useState(USE_MOCK);

  useEffect(() => {
    if (USE_MOCK) return undefined;
    let vivo = true;
    authApi
      .yo()
      .then((u) => vivo && setUser(u))
      .catch(() => vivo && setUser(null))
      .finally(() => vivo && setReady(true));
    setUnauthorizedHandler(() => setUser(null));
    return () => {
      vivo = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    if (!USE_MOCK) {
      const pub = await authApi.login(username, password);
      setUser(pub);
      return pub;
    }
    await new Promise((r) => setTimeout(r, 450));
    const found = findByCredentials(username, password);
    if (!found) throw new Error('Usuario o clave incorrectos.');
    const pub = toPublicUser(found);
    localStorage.setItem(KEY, JSON.stringify({ username: pub.username }));
    setActor(pub);
    setUser(pub);
    return pub;
  }, []);

  const logout = useCallback(() => {
    if (!USE_MOCK) {
      authApi.logout().catch(() => {});
    } else {
      localStorage.removeItem(KEY);
      setActor(null);
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
