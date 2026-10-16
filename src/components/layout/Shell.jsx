import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { OctagonAlert } from 'lucide-react';
import { useStoreState } from '../../data/mockStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const { emergencia } = useStoreState().config;

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="main">
        <Topbar onMenu={() => setNavOpen((v) => !v)} menuOpen={navOpen} />
        {emergencia.activa && (
          <div className="emergency-banner" role="alert">
            <OctagonAlert size={18} aria-hidden="true" />
            <span>
              Interruptor de emergencia activo: los retiros nuevos están pausados y el agente responde «el servicio está en
              mantenimiento».
            </span>
          </div>
        )}
        <motion.main
          id="main"
          className="content"
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
