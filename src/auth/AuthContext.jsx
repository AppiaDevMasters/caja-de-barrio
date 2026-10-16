import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { findByCredentials, findByUsername, toPublicUser } from '../data/mock/users';
import { setActor } from '../api/admin';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = readSession();
    setActor(u);
    return u;
  });

  const login = useCallback(async (username, password) => {
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
    localStorage.removeItem(KEY);
    setActor(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
