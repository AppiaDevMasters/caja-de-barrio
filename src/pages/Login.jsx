import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { KeyRound, LoaderCircle, LockKeyhole, ScrollText, ShieldCheck, Vault } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <aside className="login-aside">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Vault size={19} />
          </span>
          <div>
            <div className="brand-name">Caja de Barrio</div>
            <div className="brand-sub" style={{ color: 'rgba(255,255,255,.7)' }}>
              Panel de operación
            </div>
          </div>
        </div>
        <div>
          <h2>Cada retiro vigilado. Cada decisión, con motivo.</h2>
          <p>
            La consola donde el equipo de operación decide quién entra a la red, vigila los retiros y responde a las alertas
            de riesgo. El agente atiende; aquí los humanos tienen la última palabra.
          </p>
        </div>
        <ul className="login-points">
          <li>
            <ShieldCheck size={18} /> Mínimo privilegio por rol y regla de cuatro ojos
          </li>
          <li>
            <ScrollText size={18} /> Auditoría inmutable de toda acción
          </li>
          <li>
            <LockKeyhole size={18} /> Cédulas y teléfonos enmascarados por defecto
          </li>
        </ul>
      </aside>

      <main className="login-main">
        <motion.div
          className="login-box"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <h1>Iniciar sesión</h1>
            <p className="muted">Acceso solo para el equipo de operación.</p>
          </div>

          <form className="login-form" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="usuario">Usuario</label>
              <input
                id="usuario"
                className="input"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="clave">Clave</label>
              <input
                id="clave"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy || !username || !password}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <KeyRound size={16} />}
              Entrar
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
