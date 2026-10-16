import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { canAccess } from './auth/permissions';
import { ToastProvider } from './components/ui/Toast';
import { Forbidden } from './components/ui/primitives';
import Shell from './components/layout/Shell';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Personas from './pages/Personas';
import PersonaDetail from './pages/PersonaDetail';
import Tiendas from './pages/Tiendas';
import TiendaDetail from './pages/TiendaDetail';
import Retiros from './pages/Retiros';
import RetiroDetail from './pages/RetiroDetail';
import Solicitudes from './pages/Solicitudes';
import SolicitudDetail from './pages/SolicitudDetail';
import Alertas from './pages/Alertas';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';
import MapaStub from './pages/MapaStub';

function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Shell />;
}

function Guard({ route }) {
  const { user } = useAuth();
  return canAccess(user.rol, route) ? <Outlet /> : <Forbidden />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route index element={<Inicio />} />
                <Route element={<Guard route="personas" />}>
                  <Route path="personas" element={<Personas />} />
                  <Route path="personas/:id" element={<PersonaDetail />} />
                </Route>
                <Route element={<Guard route="solicitudes" />}>
                  <Route path="solicitudes" element={<Solicitudes />} />
                  <Route path="solicitudes/:id" element={<SolicitudDetail />} />
                </Route>
                <Route element={<Guard route="tiendas" />}>
                  <Route path="tiendas" element={<Tiendas />} />
                  <Route path="tiendas/:id" element={<TiendaDetail />} />
                </Route>
                <Route element={<Guard route="retiros" />}>
                  <Route path="retiros" element={<Retiros />} />
                  <Route path="retiros/:id" element={<RetiroDetail />} />
                </Route>
                <Route element={<Guard route="alertas" />}>
                  <Route path="alertas" element={<Alertas />} />
                </Route>
                <Route element={<Guard route="mapa" />}>
                  <Route path="mapa" element={<MapaStub />} />
                </Route>
                <Route element={<Guard route="auditoria" />}>
                  <Route path="auditoria" element={<Auditoria />} />
                </Route>
                <Route element={<Guard route="configuracion" />}>
                  <Route path="configuracion" element={<Configuracion />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
