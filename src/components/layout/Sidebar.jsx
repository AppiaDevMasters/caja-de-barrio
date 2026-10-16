import { NavLink } from 'react-router-dom';
import {
  Banknote,
  LayoutDashboard,
  Map,
  ScrollText,
  Settings,
  ShieldAlert,
  Store,
  Users,
  Vault,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { canAccess } from '../../auth/permissions';
import { useStoreState } from '../../data/mockStore';
import { alertaPendiente } from '../../api/admin';

const NAV = [
  { to: '/', route: 'inicio', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/personas', route: 'personas', label: 'Personas', icon: Users, badge: 'personas' },
  { to: '/tiendas', route: 'tiendas', label: 'Tiendas', icon: Store },
  { to: '/retiros', route: 'retiros', label: 'Reservas y retiros', icon: Banknote },
  { to: '/alertas', route: 'alertas', label: 'Alertas de riesgo', icon: ShieldAlert, badge: 'alertas' },
  { to: '/mapa', route: 'mapa', label: 'Mapa de liquidez', icon: Map, soon: true },
  { to: '/auditoria', route: 'auditoria', label: 'Auditoría', icon: ScrollText },
  { to: '/configuracion', route: 'configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  const state = useStoreState();
  const counts = {
    personas: state.personas.filter((p) => p.estado_registro === 'revision_manual').length,
    alertas: state.alertas.filter(alertaPendiente).length,
  };

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="sidebar" aria-label="Módulos del panel">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Vault size={19} />
        </span>
        <div>
          <div className="brand-name">Caja de Barrio</div>
          <div className="brand-sub">Panel de operación</div>
        </div>
      </div>

      <nav aria-label="Principal" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="nav-label">Módulos</div>
        {NAV.filter((n) => canAccess(user.rol, n.route)).map((n) => {
          const Icon = n.icon;
          if (n.soon) {
            return (
              <span key={n.to} className="nav-link" aria-disabled="true" title="Fase posterior (H3 / PostGIS)">
                <Icon size={18} aria-hidden="true" />
                <span className="nav-text">{n.label}</span>
                <span className="nav-tag">Pronto</span>
              </span>
            );
          }
          const count = n.badge ? counts[n.badge] : 0;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="nav-text">{n.label}</span>
              {count > 0 && (
                <span className="nav-count" aria-label={`${count} pendientes`}>
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        Entorno MVP con datos de prueba. Las acciones no afectan a usuarios reales.
      </div>
    </aside>
  );
}
