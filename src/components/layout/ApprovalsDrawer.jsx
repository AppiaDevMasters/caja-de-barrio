import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Users, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { admin, selectAprobacionesPendientes } from '../../api/admin';
import { useStoreState } from '../../data/mockStore';
import { TIPO_APROBACION } from '../../data/mock/aprobaciones';
import { relative } from '../../utils/format';
import ActionDialog from '../ui/ActionDialog';
import { EmptyState } from '../ui/primitives';

export default function ApprovalsDrawer({ open, onClose }) {
  const { user } = useAuth();
  const state = useStoreState();
  const [dlg, setDlg] = useState(null);
  const pendientes = selectAprobacionesPendientes(state);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !dlg && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dlg, onClose]);

  const decidir = (ap, decision) =>
    setDlg({
      title: decision === 'aprobar' ? `Aprobar: ${TIPO_APROBACION[ap.tipo]}` : `Rechazar: ${TIPO_APROBACION[ap.tipo]}`,
      description: `${ap.entidad.nombre} · segunda firma de cuatro ojos.`,
      tone: decision === 'rechazar' ? 'danger' : 'default',
      confirmLabel: decision === 'aprobar' ? 'Aprobar y ejecutar' : 'Rechazar solicitud',
      successMsg: (r) =>
        r.ejecutada ? 'Aprobación completa: la acción se ejecutó.' : 'Solicitud rechazada.',
      run: ({ motivo }) => admin.decidirAprobacion(ap.id, decision, motivo),
    });

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="scrim"
              style={{ zIndex: 55 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="drawer"
              role="dialog"
              aria-label="Aprobaciones de cuatro ojos"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="drawer-head">
                <div>
                  <h2>Aprobaciones pendientes</h2>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Regla de cuatro ojos: dos usuarios distintos
                  </span>
                </div>
                <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              <div className="drawer-body">
                {pendientes.length === 0 && (
                  <EmptyState icon={Users} title="Sin solicitudes pendientes">
                    Los desbloqueos y ascensos a Aliado aparecerán aquí.
                  </EmptyState>
                )}
                {pendientes.map((ap) => {
                  const yaFirmo = ap.firmas.some((f) => f.usuario === user.username);
                  const to = ap.entidad.tipo === 'persona' ? `/personas/${ap.entidad.id}` : `/tiendas/${ap.entidad.id}`;
                  return (
                    <article key={ap.id} className="approval">
                      <div>
                        <div className="mono muted" style={{ fontSize: 12 }}>
                          {ap.id} · {relative(ap.solicitada_en)}
                        </div>
                        <strong>{TIPO_APROBACION[ap.tipo]}</strong>
                        <div>
                          <Link to={to} onClick={onClose}>
                            {ap.entidad.nombre}
                          </Link>
                        </div>
                      </div>
                      <p style={{ fontSize: 14 }}>«{ap.motivo}»</p>
                      <div className="approval-sign">
                        <span className="badge badge--success">1 de 2 · {ap.firmas[0].nombre}</span>
                        <span className="badge badge--neutral">Falta otra persona</span>
                      </div>
                      {yaFirmo ? (
                        <p className="help muted" style={{ fontSize: 13 }}>
                          Tú iniciaste esta solicitud: la segunda firma debe ser de otro usuario.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => decidir(ap, 'aprobar')}>
                            <Check size={15} /> Aprobar
                          </button>
                          <button type="button" className="btn btn--outline-danger btn--sm" onClick={() => decidir(ap, 'rechazar')}>
                            <X size={15} /> Rechazar
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
