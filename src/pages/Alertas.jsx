import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Ban, Download, EyeOff, Flag } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin, exportRowsUiaf, selectAlertas } from '../api';
import { useStoreState } from '../data/mockStore';
import { REGLAS_ALERTA } from '../data/mock/alertas';
import { dateTime, downloadCSV, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { Chips, EmptyState, PageHeader, Select, useSimulatedLoad } from '../components/ui/primitives';

export default function Alertas() {
  const { user } = useAuth();
  const state = useStoreState();
  const loading = useSimulatedLoad();
  const [params, setParams] = useSearchParams();
  const [dlg, setDlg] = useState(null);
  const estado = params.get('estado') || 'pendientes';
  const regla = params.get('regla') || 'todas';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    const defaultValue = key === 'estado' ? 'pendientes' : 'todas';
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const rows = selectAlertas(state, { estado, regla });
  const pend = state.alertas.filter((a) => a.estado === 'abierta' || a.estado === 'escalada').length;
  const uiaf = exportRowsUiaf(state);
  const canResolve = can(user.rol, 'alerta.resolver');

  const options = [
    { value: 'pendientes', label: 'Pendientes', count: pend },
    { value: 'escalada', label: 'Escaladas', count: state.alertas.filter((a) => a.estado === 'escalada').length },
    { value: 'cerradas', label: 'Cerradas', count: state.alertas.length - pend },
    { value: 'todas', label: 'Todas', count: state.alertas.length },
  ];

  const objetivo = (a) => {
    const p = a.persona_id && state.personas.find((x) => x.id === a.persona_id);
    const t = a.tienda_id && state.tiendas.find((x) => x.id === a.tienda_id);
    return { p, t };
  };

  const descartar = (a) =>
    setDlg({
      title: `Descartar ${a.id}`,
      description: 'Explica por qué no es un riesgo real. Quedará en auditoría.',
      confirmLabel: 'Descartar alerta',
      successMsg: 'Alerta descartada.',
      run: ({ motivo }) => admin.resolverAlerta(a.id, 'descartar', motivo),
    });

  const bloquear = (a) => {
    const { p, t } = objetivo(a);
    const nombre = p ? p.nombre : t.nombre;
    setDlg({
      title: p ? `Bloquear a ${nombre}` : `Suspender ${nombre}`,
      description: p
        ? 'El agente dejará de atender sus retiros y se le avisará por WhatsApp de forma neutral.'
        : 'La tienda queda suspendida por riesgo. Reactivarla requerirá cuatro ojos.',
      tone: 'danger',
      confirmLabel: p ? 'Bloquear cuenta' : 'Suspender tienda',
      successMsg: (r) => `${r.objetivo} ${p ? 'bloqueada' : 'suspendida'}. Alerta ${a.id} resuelta.`,
      run: ({ motivo }) => admin.resolverAlerta(a.id, 'bloquear', motivo),
    });
  };

  const escalar = (a) =>
    setDlg({
      title: `Escalar ${a.id}`,
      description: 'Se mantiene en la cola como «Escalada» para revisión de un nivel superior.',
      confirmLabel: 'Escalar',
      successMsg: 'Alerta escalada.',
      run: ({ motivo }) => admin.resolverAlerta(a.id, 'escalar', motivo),
    });

  const marcar = (a) =>
    setDlg({
      title: a.uiaf ? `Quitar marca UIAF de ${a.id}` : `Marcar ${a.id} para reporte UIAF`,
      description: a.uiaf
        ? 'El caso dejará de incluirse en la exportación.'
        : 'El caso se incluirá en la exportación para el reporte de operación sospechosa de la entidad aliada.',
      confirmLabel: a.uiaf ? 'Quitar marca' : 'Marcar para reporte',
      successMsg: (r) => (r.marcada ? 'Caso marcado para reporte UIAF.' : 'Marca UIAF retirada.'),
      run: ({ motivo }) => admin.marcarUiaf(a.id, motivo),
    });

  const exportar = () => {
    downloadCSV('casos-uiaf-caja-de-barrio.csv', uiaf);
  };

  return (
    <>
      <PageHeader
        title="Alertas de riesgo"
        subtitle="Generadas por el agente de riesgo. Cada resolución exige un motivo."
        actions={
          can(user.rol, 'alerta.exportar') && (
            <button className="btn" onClick={exportar} disabled={!uiaf.length}>
              <Download size={16} /> Exportar casos UIAF ({uiaf.length})
            </button>
          )
        }
      />
      <div className="filters">
        <Chips label="Filtrar por estado" options={options} value={estado} onChange={(v) => set('estado', v)} />
        <Select
          label="Regla"
          value={regla}
          onChange={(v) => set('regla', v)}
          options={[{ value: 'todas', label: 'Todas las reglas' }, ...Object.entries(REGLAS_ALERTA).map(([value, label]) => ({ value, label }))]}
        />
      </div>

      <div className="stack" aria-busy={loading}>
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ display: 'grid', gap: 10 }}>
              <span className="skeleton" style={{ width: '30%' }} />
              <span className="skeleton" style={{ width: '80%' }} />
              <span className="skeleton" style={{ width: '50%' }} />
            </div>
          ))}

        {!loading && rows.length === 0 && (
          <div className="card">
            <EmptyState title="Sin alertas con estos filtros">La cola está al día.</EmptyState>
          </div>
        )}

        {!loading &&
          rows.map((a) => {
            const { p, t } = objetivo(a);
            const abierta = a.estado === 'abierta' || a.estado === 'escalada';
            const bloqueable = p ? p.estado_registro === 'aprobada' : t && t.estado !== 'suspendida';
            return (
              <article key={a.id} className={`alert-card is-${a.estado} ${abierta ? '' : 'is-closed'}`}>
                <div className="strip" aria-hidden="true" />
                <div className="alert-body">
                  <div className="alert-top">
                    <strong>{REGLAS_ALERTA[a.regla]}</strong>
                    <StatusBadge kind="alerta" value={a.estado} />
                    <StatusBadge kind="severidad" value={a.severidad} />
                    {a.uiaf && (
                      <span className="badge badge--primary">
                        <Flag size={11} aria-hidden="true" /> UIAF
                      </span>
                    )}
                    <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
                      {a.id}
                    </span>
                  </div>
                  <p>{a.detalle}</p>
                  <div className="alert-meta">
                    {p && (
                      <span>
                        Persona: <Link to={`/personas/${p.id}`}>{p.nombre}</Link>
                      </span>
                    )}
                    {t && (
                      <span>
                        Tienda: <Link to={`/tiendas/${t.id}`}>{t.nombre}</Link>
                      </span>
                    )}
                    {a.reserva_id && (
                      <span>
                        Retiro: <Link to={`/retiros/${a.reserva_id}`}>{a.reserva_id}</Link>
                      </span>
                    )}
                    <span title={dateTime(a.creada_en)}>{relative(a.creada_en)}</span>
                  </div>
                  {a.resolucion && <p className="muted" style={{ fontSize: 13 }}>{a.resolucion}</p>}

                  {canResolve && (
                    <div className="alert-actions">
                      {abierta && bloqueable && (
                        <button className="btn btn--danger btn--sm" onClick={() => bloquear(a)}>
                          <Ban size={15} /> {p ? 'Bloquear persona' : 'Suspender tienda'}
                        </button>
                      )}
                      {abierta && (
                        <button className="btn btn--sm" onClick={() => descartar(a)}>
                          <EyeOff size={15} /> Descartar
                        </button>
                      )}
                      {a.estado === 'abierta' && (
                        <button className="btn btn--sm" onClick={() => escalar(a)}>
                          <ArrowUpRight size={15} /> Escalar
                        </button>
                      )}
                      <button className="btn btn--sm" onClick={() => marcar(a)}>
                        <Flag size={15} /> {a.uiaf ? 'Quitar marca UIAF' : 'Marcar para UIAF'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
