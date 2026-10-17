import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpCircle, Ban, Check, ExternalLink, MapPin, SlidersHorizontal, Star } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { USE_MOCK, admin, efectivoLibre, getTienda, useAdminQuery } from '../api';
import { useStoreState } from '../data/mockStore';
import { cop, dateTime, maskCedula, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import MaskField from '../components/ui/MaskField';
import BilleteraCard from '../components/ui/BilleteraCard';
import StatusBadge from '../components/ui/StatusBadge';
import { BackLink, Card, DefList, EmptyState, Forbidden, Notice, QueryError } from '../components/ui/primitives';

const yesNo = (v, y, n) => (
  <span className={`badge badge--${v ? 'success' : 'warning'}`}>{v ? y : n}</span>
);

export default function TiendaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useStoreState();
  const [dlg, setDlg] = useState(null);
  const { data: t, loading, error, refetch } = useAdminQuery(`tienda:${id}`, () => getTienda(id));

  if (!t) {
    return (
      <>
        <BackLink to="/tiendas">Tiendas</BackLink>
        {loading ? (
          <div className="card" style={{ display: 'grid', gap: 10 }} aria-busy="true">
            <span className="skeleton" style={{ width: '35%', height: 24 }} />
            <span className="skeleton" style={{ width: '80%' }} />
            <span className="skeleton" style={{ width: '60%' }} />
          </div>
        ) : error && error.status !== 404 ? (
          <QueryError error={error} onRetry={refetch} />
        ) : (
          <EmptyState title="Tienda no encontrada" />
        )}
      </>
    );
  }
  if (user.rol === 'aliado' && t.redId !== user.redId) return <Forbidden />;

  const libre = efectivoLibre(t);
  const pctReservado = t.efectivo_publicado_cop ? Math.round((t.efectivo_reservado_cop / t.efectivo_publicado_cop) * 100) : 0;
  // Reservas y cuatro ojos todavía salen del mock: en modo real no se muestran.
  const enCurso = USE_MOCK ? state.reservas.filter((r) => r.tienda_id === t.id && ['reservada', 'pagada'].includes(r.estado)) : [];
  const aprobacion = USE_MOCK ? state.aprobaciones.find((a) => a.estado === 'pendiente' && a.entidad.id === t.id) : null;
  const topeMax = state.config.topes[t.nivel]?.retiro ?? t.tope_retiro_cop;
  const pendienteVerif = t.estado === 'pendiente_verificacion';
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
                : pendienteVerif
                  ? 'Aprobación manual del tendero: úsala solo si revisaste su identidad. Se le avisa por WhatsApp que su tienda quedó activa.'
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
            <span className="mono">{t.id}</span> · {t.barrio || t.direccion} · alta {relative(t.creada_en)}
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
      {pendienteVerif && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warning">
            <strong>Pendiente de verificación:</strong>{' '}
            {t.motivo_revision || 'El tendero debe escribir al agente para hacer su verificación de identidad (Didit).'} Si Verifik no
            confirma, aquí se puede activar a mano.
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

          {USE_MOCK && (
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
          )}

          <Card title="Dueño y verificaciones">
            <DefList
              items={[
                ['Dueño', t.dueno.nombre],
                [
                  'Documento',
                  !t.dueno.cedula ? (
                    <span className="muted">Aún sin verificar</span>
                  ) : user.rol === 'aliado' ? (
                    <span className="mono muted">{maskCedula(t.dueno.cedula)}</span>
                  ) : (
                    <MaskField masked={maskCedula(t.dueno.cedula)} entity="tienda" entityId={t.id} field="cedula" />
                  ),
                ],
                ['Identidad', yesNo(t.dueno.verificado, 'Verificado', 'Pendiente')],
                ['RUT / registro mercantil', t.nivel === 'basico' ? <span className="muted">No exigido en nivel Básico</span> : yesNo(t.rut, 'Cargado', 'Falta')],
                [
                  'Didit · cara',
                  t.didit.liveness === 'aprobada' ? (
                    <span key="dd" className="badge badge--success">
                      Aprobada{t.didit.score !== null && t.didit.score !== undefined ? ` · ${Number(t.didit.score).toFixed(2)}` : ''}
                    </span>
                  ) : t.didit.liveness === 'fallida' ? (
                    <span key="dd" className="badge badge--danger">Fallida</span>
                  ) : (
                    <span key="dd" className="badge badge--neutral">Pendiente</span>
                  ),
                ],
                [
                  'Verifik · cédula',
                  t.verifik.valida === null || t.verifik.valida === undefined ? (
                    <span key="vf" className="badge badge--neutral">{t.verifik.error ? 'Sin respuesta' : 'Pendiente'}</span>
                  ) : t.verifik.valida && t.verifik.nombre_coincide ? (
                    <span key="vf" className="badge badge--success">Válida · nombre coincide</span>
                  ) : (
                    <span key="vf" className="badge badge--danger">{t.verifik.valida ? 'Nombre no coincide' : 'No válida'}</span>
                  ),
                ],
                t.verifik.error && ['Error de Verifik', <span key="ve" className="badge badge--warning">{t.verifik.error}</span>],
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

          {t.lat !== null && t.lat !== undefined && t.lon !== null && t.lon !== undefined && (
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
          )}

          <BilleteraCard billetera={t.billetera} />
          <p className="help muted" style={{ fontSize: 12 }}>
            Dirección pública. Las llaves de Open Payments nunca pasan por el panel.
          </p>

          <p className="muted" style={{ fontSize: 12 }}>
            Registrada el {dateTime(t.creada_en)}
          </p>
        </div>
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
