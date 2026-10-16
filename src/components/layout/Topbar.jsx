import { useEffect, useState } from 'react';
import { Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { can, ROLE_LABEL } from '../../auth/permissions';
import { useStoreState } from '../../data/mockStore';
import { selectAprobacionesPendientes } from '../../api';
import { initials } from '../../utils/format';
import ApprovalsDrawer from './ApprovalsDrawer';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('cdb.theme', theme);
  }, [theme]);
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="btn btn--ghost btn--icon"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function Topbar({ onMenu, menuOpen }) {
  const { user, logout } = useAuth();
  const state = useStoreState();
  const [drawer, setDrawer] = useState(false);
  const pendientes = selectAprobacionesPendientes(state).length;
  const emergencia = state.config.emergencia.activa;
  const showApprovals = can(user.rol, 'aprobacion.decidir');

  return (
    <>
    <header className="topbar">
      <div className="topbar-group">
        <button
          type="button"
          className="btn btn--ghost btn--icon menu-btn"
          onClick={onMenu}
          aria-label="Abrir menú de módulos"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
        >
          <Menu size={20} />
        </button>
        <span className={`status-chip ${emergencia ? 'is-off' : ''}`} role="status">
          <span className="dot" aria-hidden="true" />
          {emergencia ? 'Retiros pausados' : 'Servicio operativo'}
        </span>
      </div>

      <div className="topbar-group">
        {showApprovals && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setDrawer(true)}
            aria-label={`Aprobaciones de cuatro ojos pendientes: ${pendientes}`}
          >
            <Bell size={18} />
            <span className="label-long">Aprobaciones</span>
            {pendientes > 0 && <span className="nav-count">{pendientes}</span>}
          </button>
        )}
        <ThemeToggle />
        <div className="user-chip">
          <div className="who">
            <b>{user.nombre}</b>
            <span>{ROLE_LABEL[user.rol]}</span>
          </div>
          <span className="avatar" aria-hidden="true">
            {initials(user.nombre)}
          </span>
          <button type="button" className="btn btn--ghost btn--icon" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>

    </header>
    <ApprovalsDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}
