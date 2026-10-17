import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Ban, Download, EyeOff, Flag } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { USE_MOCK, admin, alertaPendiente, filtrarAlertas, getAlertas, useAdminQuery } from '../api';
import { REGLAS_ALERTA } from '../data/mock/alertas';
import { dateTime, downloadCSV, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { Chips, EmptyState, PageHeader, QueryError, Select } from '../components/ui/primitives';

const reglaLabel = (regla) => REGLAS_ALERTA[regla] || regla;

export default function Alertas() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useAdminQuery('alertas', () => getAlertas());
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

  const base = data || [];
  const rows = filtrarAlertas(base, { estado, regla });
  const pend = base.filter(alertaPendiente).length;
  // Escalar, bloquear/suspender desde la alerta y UIAF solo existen en el mock: el backend aún no los tiene.
  const uiaf = USE_MOCK ? base.filter((a) => a.uiaf) : [];
  const canResolve = can(user.rol, 'alerta.resolver');

  const options = [
    { value: 'pendientes', label: 'Pendientes', count: pend },
    ...(USE_MOCK ? [{ value: 'escalada', label: 'Escaladas', count: base.filter((a) => a.estado === 'escalada').length }] : []),
    { value: 'cerradas', label: 'Cerradas', count: base.length - pend },
    { value: 'todas', label: 'Todas', count: base.length },
  ];

  // Reglas del catálogo más cualquiera que llegue del backend.
  const reglas = [...new Set([...Object.keys(REGLAS_ALERTA), ...base.map((a) => a.regla)])];

  const descartar = (a) =>
    setDlg({
      title: `Descartar ${a.id}`,
      description: 'Explica por qué no es un riesgo real. Quedará en auditoría.',
      confirmLabel: 'Descartar alerta',
      successMsg: 'Alerta descartada.',
      run: ({ motivo }) => admin.resolverAlerta(a.id, 'descartar', motivo),
    });

  const bloquear = (a) => {
    const persona = Boolean(a.persona_id);
    const nombre = persona ? a.nombre_persona : a.nombre_tienda;
    setDlg({
      title: persona ? `Bloquear a ${nombre}` : `Suspender ${nombre}`,
      description: persona
        ? 'El agente dejará de atender sus retiros y se le avisará por WhatsApp de forma neutral.'
        : 'La tienda queda suspendida por riesgo. Reactivarla requerirá cuatro ojos.',
      tone: 'danger',
      confirmLabel: persona ? 'Bloquear cuenta' : 'Suspender tienda',
      successMsg: (r) => `${r.objetivo} ${persona ? 'bloqueada' : 'suspendida'}. Alerta ${a.id} resuelta.`,
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

  const exportar = () =>
    downloadCSV(
      'casos-uiaf-caja-de-barrio.csv',
      uiaf.map((a) => ({
        alerta: a.id,
        regla: reglaLabel(a.regla),
        detalle: a.detalle,
        persona: a.nombre_persona || '',
        tienda: a.nombre_tienda || '',
        creada_en: a.creada_en,
        estado: a.estado,
        resolucion: a.resolucion || '',
      }))
    );

  return (
    <>
      <PageHeader
        title="Alertas de riesgo"
        subtitle="Generadas por el agente de riesgo. Cada resolución exige un motivo."
        actions={
          USE_MOCK &&
          can(user.rol, 'alerta.exportar') && (
            <button className="btn" onClick={exportar} disabled={!uiaf.length}>
              <Download size={16} /> Exportar casos UIAF ({uiaf.length})
            </button>
          )
        }
      />
      <QueryError error={error} onRetry={refetch} />
      <div className="filters">
        <Chips label="Filtrar por estado" options={options} value={estado} onChange={(v) => set('estado', v)} />
        <Select
          label="Regla"
          value={regla}
          onChange={(v) => set('regla', v)}
          options={[{ value: 'todas', label: 'Todas las reglas' }, ...reglas.map((value) => ({ value, label: reglaLabel(value) }))]}
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
            const abierta = alertaPendiente(a);
            return (
              <article key={a.id} className={`alert-card is-${a.estado} ${abierta ? '' : 'is-closed'}`}>
                <div className="strip" aria-hidden="true" />
                <div className="alert-body">
                  <div className="alert-top">
                    <strong>{reglaLabel(a.regla)}</strong>
                    <StatusBadge kind="alerta" value={a.estado} />
                    {a.severidad && <StatusBadge kind="severidad" value={a.severidad} />}
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
                    {a.nombre_persona && (
                      <span>
                        Persona: {a.persona_id ? <Link to={`/personas/${a.persona_id}`}>{a.nombre_persona}</Link> : a.nombre_persona}
                      </span>
                    )}
                    {a.nombre_tienda && (
                      <span>
                        Tienda: {a.tienda_id ? <Link to={`/tiendas/${a.tienda_id}`}>{a.nombre_tienda}</Link> : a.nombre_tienda}
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
                      {USE_MOCK && abierta && a.bloqueable && (
                        <button className="btn btn--danger btn--sm" onClick={() => bloquear(a)}>
                          <Ban size={15} /> {a.persona_id ? 'Bloquear persona' : 'Suspender tienda'}
                        </button>
                      )}
                      {abierta && (
                        <button className="btn btn--sm" onClick={() => descartar(a)}>
                          <EyeOff size={15} /> {USE_MOCK ? 'Descartar' : 'Resolver'}
                        </button>
                      )}
                      {USE_MOCK && a.estado === 'abierta' && (
                        <button className="btn btn--sm" onClick={() => escalar(a)}>
                          <ArrowUpRight size={15} /> Escalar
                        </button>
                      )}
                      {USE_MOCK && (
                        <button className="btn btn--sm" onClick={() => marcar(a)}>
                          <Flag size={15} /> {a.uiaf ? 'Quitar marca UIAF' : 'Marcar para UIAF'}
                        </button>
                      )}
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
