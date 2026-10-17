import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ExternalLink, MapPin, MessageSquareWarning, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin } from '../api';
import { useStoreState } from '../data/mockStore';
import { CAMPOS_CORRECCION, CHECK_LABEL } from '../data/mock/solicitudes';
import { cop, dateTime, maskCedula, maskPhone, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import MaskField from '../components/ui/MaskField';
import StatusBadge from '../components/ui/StatusBadge';
import { BackLink, Card, DefList, EmptyState, Notice } from '../components/ui/primitives';
import { Semaforo } from './Solicitudes';

const ACCION_LABEL = {
  solicitud_creada: 'Solicitud creada por WhatsApp',
  didit_aprobada: 'Didit aprobó la verificación facial',
  didit_rechazada: 'Didit rechazó la verificación facial',
  en_revision: 'Pasó a revisión',
  pedir_correccion: 'Corrección pedida',
  aprobada: 'Solicitud aprobada',
  rechazada: 'Solicitud rechazada',
};

const CHECK_LABEL_ESTADO = { ok: 'OK', alerta: 'Alerta', error: 'Error' };

function Estado({ check }) {
  if (!check) return null;
  return <span className={`badge badge--${tone(check.estado)}`}>{CHECK_LABEL_ESTADO[check.estado]}</span>;
}

const tone = (estado) => ({ ok: 'success', alerta: 'warning', error: 'danger' })[estado] || 'neutral';

export default function SolicitudDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useStoreState();
  const [dlg, setDlg] = useState(null);
  const x = state.solicitudes.find((s) => s.id === id);

  if (!x) {
    return (
      <>
        <BackLink to="/solicitudes">Solicitudes</BackLink>
        <EmptyState title="Solicitud no encontrada" />
      </>
    );
  }

  const enRevision = x.estado === 'en_revision';
  const hayError = x.checks.some((c) => c.estado === 'error');
  const checkOf = (clave) => x.checks.find((c) => c.clave === clave);
  const tiendaCreada = x.tienda_id && state.tiendas.find((t) => t.id === x.tienda_id);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${x.tienda.lat}&mlon=${x.tienda.lon}#map=17/${x.tienda.lat}/${x.tienda.lon}`;
  const campoLabel = (v) => CAMPOS_CORRECCION.find((c) => c.value === v)?.label || v;

  const acciones = [];
  if (enRevision && can(user.rol, 'solicitud.aprobar')) {
    acciones.push(
      <button
        key="ap"
        className="btn btn--primary"
        onClick={() =>
          setDlg({
            title: 'Aprobar solicitud',
            description: `Se crea ${x.tienda.nombre} como tienda activa y ${x.solicitante.nombre} queda como tendero. Subir a aliado requiere cuatro ojos después.`,
            confirmLabel: 'Aprobar y crear tienda',
            successMsg: (r) => `Tienda creada (${r.tienda_id}) y activa.`,
            fields: [
              {
                name: 'nivel',
                label: 'Nivel inicial',
                type: 'select',
                defaultValue: 'basico',
                options: [
                  { value: 'basico', label: 'Básico' },
                  { value: 'comercio', label: 'Comercio (con RUT)' },
                ],
              },
            ],
            preview: hayError ? (
              <Notice tone="warning">Hay verificaciones en rojo: el sistema no permitirá aprobar hasta corregirlas.</Notice>
            ) : null,
            run: ({ motivo, values }) => admin.aprobarSolicitud(x.id, values.nivel, motivo),
          })
        }
      >
        <Check size={16} /> Aprobar
      </button>
    );
  }
  if (enRevision && can(user.rol, 'solicitud.correccion')) {
    acciones.push(
      <button
        key="co"
        className="btn"
        onClick={() =>
          setDlg({
            title: 'Pedir corrección',
            description: 'El agente le pedirá a la persona el dato por WhatsApp. La solicitud vuelve a revisión cuando lo corrija.',
            confirmLabel: 'Pedir corrección',
            successMsg: 'Corrección solicitada.',
            fields: [
              {
                name: 'campos',
                label: 'Datos a corregir',
                type: 'checkboxes',
                defaultValue: [],
                options: CAMPOS_CORRECCION,
              },
            ],
            run: ({ motivo, values }) => admin.pedirCorreccionSolicitud(x.id, values.campos, motivo),
          })
        }
      >
        <MessageSquareWarning size={16} /> Pedir corrección
      </button>
    );
  }
  if (['en_revision', 'correccion_pedida'].includes(x.estado) && can(user.rol, 'solicitud.rechazar')) {
    acciones.push(
      <button
        key="rj"
        className="btn btn--outline-danger"
        onClick={() =>
          setDlg({
            title: 'Rechazar solicitud',
            description: 'La solicitud queda cerrada. La persona recibe un mensaje neutro por WhatsApp.',
            tone: 'danger',
            confirmLabel: 'Rechazar solicitud',
            successMsg: 'Solicitud rechazada.',
            run: ({ motivo }) => admin.rechazarSolicitud(x.id, motivo),
          })
        }
      >
        <X size={16} /> Rechazar
      </button>
    );
  }

  const verifik = checkOf('cedula_valida');
  const face = checkOf('face_match');
  const wallet = checkOf('wallet_resuelve');
  const ubic = checkOf('ubicacion');
  const dup = checkOf('duplicados');
  const pol = checkOf('politicas');

  return (
    <>
      <BackLink to="/solicitudes">Solicitudes</BackLink>
      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {x.tienda.nombre} <StatusBadge kind="solicitud" value={x.estado} />
          </h1>
          <p>
            <span className="mono">{x.id}</span> · {x.solicitante.nombre} · recibida {relative(x.creada_en)}
          </p>
        </div>
        {acciones.length > 0 && <div className="page-actions">{acciones}</div>}
      </div>

      {x.estado === 'verificando' && (
        <div style={{ marginBottom: 16 }}>
          <Notice>La persona aún no termina la verificación facial. Aparecerá como «En revisión» cuando Didit responda.</Notice>
        </div>
      )}
      {x.estado === 'correccion_pedida' && x.correccion && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warning">
            <strong>Esperando corrección de:</strong> {x.correccion.campos.map(campoLabel).join(', ')}. «{x.correccion.motivo}»
          </Notice>
        </div>
      )}
      {x.estado === 'aprobada' && (
        <div style={{ marginBottom: 16 }}>
          <Notice>
            Aprobada por {x.decision.por}. La tienda{' '}
            {tiendaCreada ? <Link to={`/tiendas/${tiendaCreada.id}`}>{tiendaCreada.nombre}</Link> : 'fue creada'} quedó activa.
          </Notice>
        </div>
      )}
      {x.estado === 'rechazada' && x.decision && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warning">
            <strong>Rechazada por {x.decision.por}:</strong> {x.decision.motivo}
          </Notice>
        </div>
      )}

      <div className="grid-2">
        <div className="stack">
          <Card title="Identidad" actions={<Estado check={verifik} />}>
            <DefList
              items={[
                ['Nombre', x.solicitante.nombre],
                ['Cédula', <MaskField key="c" masked={maskCedula(x.solicitante.cedula)} entity="solicitud" entityId={x.id} field="cedula" />],
                ['WhatsApp', <MaskField key="w" masked={maskPhone(x.solicitante.whatsapp)} entity="solicitud" entityId={x.id} field="whatsapp" />],
                ['Verifik', verifik?.detalle],
                x.verifik.nombre_registrado && ['Según Verifik', <span key="n" className="mono">{x.verifik.nombre_registrado}</span>],
              ]}
            />
          </Card>

          <Card title="Verificación facial" actions={<Estado check={face} />}>
            <DefList
              items={[
                [
                  'Prueba de vida',
                  x.didit.liveness === 'aprobada' ? (
                    <span key="l" className="badge badge--success">Aprobada</span>
                  ) : x.didit.liveness === 'fallida' ? (
                    <span key="l" className="badge badge--danger">Fallida</span>
                  ) : (
                    <span key="l" className="badge badge--neutral">Pendiente</span>
                  ),
                ],
                [
                  'Score',
                  x.didit.score === null ? (
                    '—'
                  ) : (
                    <span key="s" className="mono">
                      {x.didit.score.toFixed(2)}{' '}
                      <span className={x.didit.score >= state.config.umbrales.diditScore ? 'badge badge--success' : 'badge badge--danger'}>
                        umbral {state.config.umbrales.diditScore.toFixed(2)}
                      </span>
                    </span>
                  ),
                ],
                ['Fecha', x.didit.en ? dateTime(x.didit.en) : '—'],
                [
                  'Sesión',
                  <a key="u" href={x.didit.session_url} target="_blank" rel="noopener noreferrer">
                    Abrir en Didit <ExternalLink size={13} style={{ verticalAlign: '-2px' }} />
                  </a>,
                ],
              ]}
            />
          </Card>

          <Card title="Tienda" actions={<Estado check={ubic} />}>
            <DefList
              items={[
                ['Nombre', x.tienda.nombre],
                ['Dirección', `${x.tienda.direccion}`],
                ['Barrio', x.tienda.barrio],
                [
                  'Pin en el mapa',
                  <a key="m" href={mapUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin size={14} style={{ verticalAlign: '-2px' }} /> {x.tienda.lat.toFixed(4)}, {x.tienda.lon.toFixed(4)}
                  </a>,
                ],
                ['Efectivo estimado al día', <span key="e" className="mono">{cop(x.tienda.efectivo_estimado_cop)}</span>],
                ['Pin vs. dirección', ubic?.detalle],
              ]}
            />
          </Card>

          <Card title="Billetera" actions={<Estado check={wallet} />}>
            <DefList
              items={[
                ['Wallet address', <span key="a" className="mono">{x.wallet.address}</span>],
                [
                  'Resuelve en Open Payments',
                  x.wallet.resuelve ? <span key="r" className="badge badge--success">Sí</span> : <span key="r" className="badge badge--danger">No</span>,
                ],
                [
                  'Moneda',
                  x.wallet.moneda === 'COP' ? (
                    <span key="m" className="badge badge--success">COP</span>
                  ) : (
                    <span key="m" className="badge badge--danger">{x.wallet.moneda || '—'}</span>
                  ),
                ],
              ]}
            />
          </Card>
        </div>

        <div className="stack">
          <Card title="Checks" hint="Calculados por el backend; el panel solo los muestra" actions={<Semaforo solicitud={x} />}>
            <ul className="list">
              {x.checks.map((c) => (
                <li key={c.clave} style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <span className="title" style={{ fontSize: 14 }}>{CHECK_LABEL[c.clave] || c.clave}</span>
                    <span className="sub">{c.detalle}</span>
                  </div>
                  <StatusBadge kind="check" value={c.estado} />
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Duplicados y políticas" actions={<Estado check={dup} />}>
            <DefList
              items={[
                ['Duplicados', dup?.detalle],
                ['Políticas aceptadas', <span key="p" className="mono">{x.politicas.version}</span>],
                ['Aceptadas el', dateTime(x.politicas.aceptadas_en)],
                ['Estado de políticas', <Estado key="pe" check={pol} />],
              ]}
            />
          </Card>

          <Card title="Historial" hint="Eventos de la solicitud y acciones del panel">
            <ul className="list">
              {[...x.historial].reverse().map((h, i) => (
                <li key={i} style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <span className="title" style={{ fontSize: 14 }}>{ACCION_LABEL[h.accion] || h.accion}</span>
                    <span className="sub">
                      {h.actor} · {dateTime(h.ts)}
                    </span>
                    {h.motivo && (
                      <span className="sub" style={{ display: 'block', marginTop: 4 }}>
                        «{h.motivo}»
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
