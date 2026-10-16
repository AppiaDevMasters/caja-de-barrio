import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpCircle, Ban, Check, ExternalLink, MapPin, SlidersHorizontal, Star } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin, efectivoLibre } from '../api';
import { useStoreState } from '../data/mockStore';
import { cop, dateTime, maskCedula, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import MaskField from '../components/ui/MaskField';
import StatusBadge from '../components/ui/StatusBadge';
import { BackLink, Card, DefList, EmptyState, Forbidden, Notice } from '../components/ui/primitives';

const yesNo = (v, y, n) => (
  <span className={`badge badge--${v ? 'success' : 'warning'}`}>{v ? y : n}</span>
);

export default function TiendaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useStoreState();
  const [dlg, setDlg] = useState(null);
  const t = state.tiendas.find((x) => x.id === id);

  if (!t) {
    return (
      <>
        <BackLink to="/tiendas">Tiendas</BackLink>
        <EmptyState title="Tienda no encontrada" />
      </>
    );
  }
  if (user.rol === 'aliado' && t.redId !== user.redId) return <Forbidden />;

  const libre = efectivoLibre(t);
  const pctReservado = t.efectivo_publicado_cop ? Math.round((t.efectivo_reservado_cop / t.efectivo_publicado_cop) * 100) : 0;
  const enCurso = state.reservas.filter((r) => r.tienda_id === t.id && ['reservada', 'pagada'].includes(r.estado));
  const aprobacion = state.aprobaciones.find((a) => a.estado === 'pendiente' && a.entidad.id === t.id);
  const topeMax = state.config.topes[t.nivel].retiro;
  const editable = user.rol !== 'aliado';

  const acciones = [];
  if (editable && can(user.rol, 'tienda.estado')) {
    if (t.estado === 'activa') {
      acciones.push(
        <button
          key="sus"
          className="btn btn--outline-danger"
          onClick={() =>
            setDlg({
              title: 'Suspender tienda',
              description: 'El agente dejará de enrutar retiros a esta tienda. Las reservas pagadas siguen su curso.',
              tone: 'danger',
              confirmLabel: 'Suspender',
              successMsg: 'Tienda suspendida.',
              run: ({ motivo }) => admin.suspenderTienda(t.id, motivo),
            })
          }
        >
          <Ban size={16} /> Suspender
        </button>
      );
    } else if (!aprobacion) {
      const riesgo = t.estado === 'suspendida' && t.suspension_riesgo;
      acciones.push(
        <button
          key="act"
          className="btn btn--primary"
          onClick={() =>
            setDlg({
              title: riesgo ? 'Solicitar reactivación' : 'Activar tienda',
              description: riesgo
                ? 'La tienda fue bloqueada por riesgo: la reactivación requiere cuatro ojos. Tu solicitud cuenta como primera firma.'
                : 'La tienda podrá recibir retiros desde este momento.',
              confirmLabel: riesgo ? 'Enviar a segunda aprobación' : 'Activar',
              successMsg: (r) => (r.aprobacion ? `Solicitud ${r.aprobacion} creada. Falta la segunda firma.` : 'Tienda activada.'),
              run: ({ motivo }) => admin.activarTienda(t.id, motivo),
            })
          }
        >
          <Check size={16} /> {riesgo ? 'Solicitar reactivación' : 'Activar'}
        </button>
      );
    }
  }
  if (editable && can(user.rol, 'tienda.nivel') && !aprobacion) {
    acciones.push(
      <button
        key="niv"
        className="btn"
        onClick={() =>
          setDlg({
            title: 'Cambiar nivel',
            description: 'Subir a Aliado requiere cuatro ojos: otra persona de cumplimiento debe confirmar.',
            confirmLabel: 'Aplicar',
            successMsg: (r) => (r.aprobacion ? `Solicitud ${r.aprobacion} creada. Falta la segunda firma.` : 'Nivel actualizado.'),
            fields: [
              {
                name: 'nivel',
                label: 'Nuevo nivel',
                type: 'select',
                defaultValue: t.nivel === 'basico' ? 'comercio' : t.nivel === 'comercio' ? 'aliado' : 'comercio',
                options: [
                  { value: 'basico', label: 'Básico' },
                  { value: 'comercio', label: 'Comercio' },
                  { value: 'aliado', label: 'Aliado (cuatro ojos)' },
                ].filter((o) => o.value !== t.nivel),
              },
            ],
            run: ({ motivo, values }) => admin.cambiarNivelTienda(t.id, values.nivel, motivo),
          })
        }
      >
        <ArrowUpCircle size={16} /> Cambiar nivel
      </button>
    );
  }
  if (editable && can(user.rol, 'tienda.tope')) {
    acciones.push(
      <button
        key="top"
        className="btn"
        onClick={() =>
          setDlg({
            title: 'Ajustar tope por retiro',
            description: `Límite del nivel ${t.nivel}: ${cop(topeMax)}.`,
            confirmLabel: 'Guardar tope',
            successMsg: 'Tope actualizado.',
            fields: [{ name: 'valor', label: 'Nuevo tope (COP)', type: 'number', min: 1, max: topeMax, defaultValue: t.tope_retiro_cop }],
            run: ({ motivo, values }) => admin.ajustarTopeTienda(t.id, values.valor, motivo),
          })
        }
      >
        <SlidersHorizontal size={16} /> Ajustar tope
      </button>
    );
  }

  return (
    <>
      <BackLink to="/tiendas">Tiendas</BackLink>
      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {t.nombre} <StatusBadge kind="tienda" value={t.estado} /> <StatusBadge kind="nivel" value={t.nivel} />
          </h1>
          <p>
            <span className="mono">{t.id}</span> · {t.barrio} · alta {relative(t.creada_en)}
          </p>
        </div>
        {acciones.length > 0 && <div className="page-actions">{acciones}</div>}
      </div>

      {aprobacion && (
        <div style={{ marginBottom: 16 }}>
          <Notice>
            Solicitud {aprobacion.id} en espera de segunda firma (iniciada por {aprobacion.firmas[0].nombre}). Regla de cuatro
            ojos.
          </Notice>
        </div>
      )}
      {t.estado === 'suspendida' && t.suspension_riesgo && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="danger">Suspendida por riesgo. Reactivarla requiere la aprobación de dos usuarios de cumplimiento.</Notice>
        </div>
      )}

      <div className="grid-2">
        <div className="stack">
          <Card title="Efectivo de hoy" hint="Publicado menos reservado">
            <div className="split" style={{ marginBottom: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>Libre</div>
                <div className="kpi-value is-money">{cop(libre)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>Publicado</div>
                <div className="kpi-value is-money" style={{ color: 'var(--c-muted)' }}>{cop(t.efectivo_publicado_cop)}</div>
              </div>
            </div>
            <div className="progress" role="img" aria-label={`${pctReservado}% del efectivo publicado está reservado`}>
              <i style={{ width: `${pctReservado}%` }} />
            </div>
            <p className="help muted" style={{ fontSize: 12, marginTop: 6 }}>
              {cop(t.efectivo_reservado_cop)} reservados ({pctReservado} %)
            </p>
          </Card>

          <Card title="Reservas en curso" hint={`${enCurso.length} activas`}>
            {enCurso.length === 0 ? (
              <p className="muted">No hay reservas en curso.</p>
            ) : (
              <ul className="list">
                {enCurso.map((r) => (
                  <li key={r.id}>
                    <div className="grow">
                      {user.rol === 'aliado' ? (
                        <span className="title mono">{r.id}</span>
                      ) : (
                        <Link className="title row-link mono" to={`/retiros/${r.id}`}>
                          {r.id}
                        </Link>
                      )}
                      <span className="sub">{relative(r.creada_en)}</span>
                    </div>
                    <span className="mono">{cop(r.monto_cop)}</span>
                    <StatusBadge kind="reserva" value={r.estado} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Dueño y verificaciones">
            <DefList
              items={[
                ['Dueño', t.dueno.nombre],
                [
                  'Documento',
                  user.rol === 'aliado' ? (
                    <span className="mono muted">{maskCedula(t.dueno.cedula)}</span>
                  ) : (
                    <MaskField masked={maskCedula(t.dueno.cedula)} entity="tienda" entityId={t.id} field="cedula" />
                  ),
                ],
                ['Identidad', yesNo(t.dueno.verificado, 'Verificado', 'Pendiente')],
                ['RUT / registro mercantil', t.nivel === 'basico' ? <span className="muted">No exigido en nivel Básico</span> : yesNo(t.rut, 'Cargado', 'Falta')],
                ['Ubicación en el mapa', yesNo(t.ubicacion_verificada, 'Verificada', 'Por verificar')],
                ['Wallet en Open Payments', yesNo(t.wallet_ok, 'Responde correctamente', 'Sin validar')],
              ]}
            />
          </Card>
        </div>

        <div className="stack">
          <Card title="Operación">
            <DefList
              items={[
                ['Tope por retiro', <span key="t" className="mono">{cop(t.tope_retiro_cop)}</span>],
                ['Entregas', `${t.entregas_completadas} completadas`],
                ['Reclamos', t.reclamos],
                [
                  'Reputación',
                  t.reputacion > 0 ? (
                    <span key="r" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <Star size={14} style={{ color: 'var(--c-primary)', fill: 'var(--c-primary)' }} aria-hidden="true" />
                      <span className="mono">{t.reputacion.toFixed(1)}</span>
                    </span>
                  ) : (
                    '—'
                  ),
                ],
                t.redId && ['Red aliada', <span key="n" className="mono">{t.redId}</span>],
              ]}
            />
          </Card>

          <Card title="Ubicación">
            <div className="notice" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text)' }}>
              <MapPin size={18} aria-hidden="true" />
              <div>
                {t.direccion}
                <div className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {t.lat.toFixed(4)}, {t.lon.toFixed(4)}
                </div>
              </div>
            </div>
            <p style={{ marginTop: 10, fontSize: 14 }}>
              <a href={`https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lon}#map=17/${t.lat}/${t.lon}`} target="_blank" rel="noopener noreferrer">
                Ver en OpenStreetMap <ExternalLink size={13} style={{ verticalAlign: '-2px' }} />
              </a>
            </p>
          </Card>

          <Card title="Wallet">
            <span className="mono" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{t.wallet}</span>
            <p className="help muted" style={{ fontSize: 12, marginTop: 6 }}>
              Dirección pública. Las llaves de Open Payments nunca pasan por el panel.
            </p>
          </Card>

          <p className="muted" style={{ fontSize: 12 }}>
            Registrada el {dateTime(t.creada_en)}
          </p>
        </div>
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
