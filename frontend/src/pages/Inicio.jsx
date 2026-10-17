import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canAccess, ROLE_LABEL } from '../auth/permissions';
import { alertaPendiente, efectivoLibre, getAlertas, getAuditoria, getPersonas, getResumen, getTiendas, useAdminQuery } from '../api';
import { REGLAS_ALERTA } from '../data/mock/alertas';
import { cop, relative } from '../utils/format';
import KpiCard from '../components/ui/KpiCard';
import StatusBadge from '../components/ui/StatusBadge';
import { Card, EmptyState, PageHeader, QueryError } from '../components/ui/primitives';

function Greeting({ user }) {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${saludo}, ${user.nombre.split(' ')[0]}`;
}

function HourBars({ data }) {
  if (!data || data.length === 0) return <p className="muted">Sin retiros registrados hoy.</p>;
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="bars" role="img" aria-label={`Retiros por hora. Pico de ${max} retiros.`}>
      {data.map((d, i) => (
        <div className={`bar ${d.n === max ? 'is-peak' : ''}`} key={d.h}>
          <b>{d.n}</b>
          <motion.i
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.45, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: `${(d.n / max) * 100}%`, minHeight: 4 }}
          />
          <span>{d.h}h</span>
        </div>
      ))}
    </div>
  );
}

export default function Inicio() {
  const { user } = useAuth();
  const esAliado = user.rol === 'aliado';
  const verAlertas = canAccess(user.rol, 'alertas');
  const verAuditoria = canAccess(user.rol, 'auditoria');

  // Cada bloque pide solo lo que el rol puede ver (el backend responde 403 al resto).
  const resumenQ = useAdminQuery(`resumen:${user.rol}`, () => getResumen(user));
  const personasQ = useAdminQuery(`personas:inicio:${user.rol}`, () => (esAliado ? [] : getPersonas()));
  const alertasQ = useAdminQuery(`alertas:inicio:${user.rol}`, () => (verAlertas ? getAlertas() : []));
  const auditoriaQ = useAdminQuery(`auditoria:inicio:${user.rol}`, () => (verAuditoria ? getAuditoria() : []));
  const redQ = useAdminQuery(`tiendas:inicio:${user.rol}`, () => (esAliado ? getTiendas(user) : []));

  const loading = resumenQ.loading;
  const kpis = resumenQ.data?.kpis || [];
  const porHora = resumenQ.data?.porHora;

  const revision = [...(personasQ.data || [])]
    .filter((p) => p.estado_registro === 'revision_manual')
    .sort((a, b) => new Date(a.creada_en) - new Date(b.creada_en))
    .slice(0, 4);
  const alertas = (alertasQ.data || []).filter(alertaPendiente).slice(0, 4);
  const actividad = [...(auditoriaQ.data || [])].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 5);
  const miRed = redQ.data || [];

  return (
    <>
      <PageHeader
        title={<Greeting user={user} />}
        subtitle={`${ROLE_LABEL[user.rol]} · Indicadores del día en Medellín`}
      />

      <QueryError error={resumenQ.error} onRetry={resumenQ.refetch} />
      <div className="kpi-grid" aria-busy={loading}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div className="kpi" key={i}>
                <span className="skeleton" style={{ width: '60%' }} />
                <span className="skeleton" style={{ width: '40%', height: 28 }} />
                <span className="skeleton" style={{ width: '70%', height: 10 }} />
              </div>
            ))
          : kpis.map((k) => (
              <KpiCard key={k.key} kpi={k} linkable={!k.role || canAccess(user.rol, k.role)} />
            ))}
      </div>

      {!esAliado && (
        <div className="grid-2">
          <div className="stack">
            <Card title="Retiros completados por hora" hint="Muestra del día · el pico se resalta">
              <HourBars data={porHora} />
            </Card>

            <Card
              title="Cola de revisión manual"
              hint="Ordenada por antigüedad"
              actions={
                <Link className="btn btn--sm" to="/personas?estado=revision_manual">
                  Ver cola <ChevronRight size={14} />
                </Link>
              }
            >
              {revision.length === 0 ? (
                <EmptyState title="Cola al día">No hay registros esperando revisión.</EmptyState>
              ) : (
                <ul className="list">
                  {revision.map((p) => (
                    <li key={p.id}>
                      <div className="grow">
                        <Link className="title row-link" to={`/personas/${p.id}`}>
                          {p.nombre}
                        </Link>
                        <span className="sub">{p.motivo_revision}</span>
                      </div>
                      <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                        {relative(p.creada_en)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="stack">
            {canAccess(user.rol, 'alertas') && (
              <Card
                title="Alertas abiertas"
                actions={
                  <Link className="btn btn--sm" to="/alertas?estado=pendientes">
                    Ver todas <ChevronRight size={14} />
                  </Link>
                }
              >
                {alertas.length === 0 ? (
                  <EmptyState title="Sin alertas abiertas" />
                ) : (
                  <ul className="list">
                    {alertas.map((a) => (
                      <li key={a.id}>
                        <div className="grow">
                          <Link className="title row-link" to="/alertas?estado=pendientes">
                            {REGLAS_ALERTA[a.regla]}
                          </Link>
                          <span className="sub">{relative(a.creada_en)}</span>
                        </div>
                        <StatusBadge kind="alerta" value={a.estado} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {canAccess(user.rol, 'auditoria') && (
              <Card
                title="Actividad reciente"
                actions={
                  <Link className="btn btn--sm" to="/auditoria">
                    Auditoría <ChevronRight size={14} />
                  </Link>
                }
              >
                <ul className="list">
                  {actividad.map((a) => (
                    <li key={a.id}>
                      <div className="grow">
                        <span className="title">
                          <span className="mono">{a.accion}</span> · {a.entidad_nombre}
                        </span>
                        <span className="sub">
                          {a.actor} · {relative(a.ts)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {esAliado && (
        <Card
          title="Tiendas de tu red"
          hint="Solo lectura"
          actions={
            <Link className="btn btn--sm" to="/tiendas">
              Ver tiendas <ChevronRight size={14} />
            </Link>
          }
        >
          <ul className="list">
            {miRed.map((t) => (
              <li key={t.id}>
                <div className="grow">
                  <Link className="title row-link" to={`/tiendas/${t.id}`}>
                    {t.nombre}
                  </Link>
                  <span className="sub">
                    {t.barrio} · efectivo libre {cop(efectivoLibre(t))}
                  </span>
                </div>
                <StatusBadge kind="tienda" value={t.estado} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
