import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FilePlus2, Gavel, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin } from '../api/admin';
import { useStoreState } from '../data/mockStore';
import { cop, dateTime, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { BackLink, Card, DefList, EmptyState, Notice, Timeline } from '../components/ui/primitives';

export default function RetiroDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useStoreState();
  const [dlg, setDlg] = useState(null);
  const r = state.reservas.find((x) => x.id === id);

  if (!r) {
    return (
      <>
        <BackLink to="/retiros">Reservas y retiros</BackLink>
        <EmptyState title="Reserva no encontrada" />
      </>
    );
  }

  const persona = state.personas.find((p) => p.id === r.persona_id);
  const tienda = state.tiendas.find((t) => t.id === r.tienda_id);
  const puedeCancelar = r.estado === 'reservada' && can(user.rol, 'reserva.cancelar');
  const puedeDisputa = ['pagada', 'entregada', 'vencida'].includes(r.estado) && can(user.rol, 'retiro.disputa');
  const puedeEvidencia = r.estado === 'en_disputa' && can(user.rol, 'retiro.disputa');

  return (
    <>
      <BackLink to="/retiros">Reservas y retiros</BackLink>
      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mono">{r.id}</span> <StatusBadge kind="reserva" value={r.estado} />
          </h1>
          <p>
            {cop(r.monto_cop)} · creada {relative(r.creada_en)}
            {['reservada', 'pagada'].includes(r.estado) && ` · vence ${relative(r.vence_en)}`}
          </p>
        </div>
        <div className="page-actions">
          {puedeCancelar && (
            <button
              className="btn btn--outline-danger"
              onClick={() =>
                setDlg({
                  title: 'Cancelar reserva',
                  description: 'Se libera el efectivo reservado en la tienda. Solo aplica a reservas sin pago.',
                  tone: 'danger',
                  confirmLabel: 'Cancelar reserva',
                  successMsg: 'Reserva cancelada y efectivo liberado.',
                  run: ({ motivo }) => admin.cancelarReserva(r.id, motivo),
                })
              }
            >
              <XCircle size={16} /> Cancelar reserva
            </button>
          )}
          {puedeDisputa && (
            <button
              className="btn"
              onClick={() =>
                setDlg({
                  title: 'Abrir disputa',
                  description: 'Marca el retiro como «en disputa» para su investigación. No revierte ni fuerza pagos.',
                  confirmLabel: 'Abrir disputa',
                  motivoLabel: 'Motivo del reclamo (obligatorio)',
                  successMsg: 'Disputa abierta.',
                  run: ({ motivo }) => admin.abrirDisputa(r.id, motivo),
                })
              }
            >
              <Gavel size={16} /> Abrir disputa
            </button>
          )}
          {puedeEvidencia && (
            <button
              className="btn btn--primary"
              onClick={() =>
                setDlg({
                  title: 'Adjuntar evidencia',
                  description: 'Describe la evidencia: llamadas, mensajes o hallazgos del caso.',
                  confirmLabel: 'Adjuntar',
                  motivoLabel: 'Descripción de la evidencia',
                  motivoPlaceholder: 'Qué se verificó, con quién y cuál fue el resultado.',
                  successMsg: 'Evidencia adjuntada.',
                  run: ({ motivo }) => admin.adjuntarEvidencia(r.id, motivo),
                })
              }
            >
              <FilePlus2 size={16} /> Adjuntar evidencia
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Notice icon={ShieldCheck}>
          Este panel no puede marcar pagos ni entregar billetes. Esas reglas viven en los servidores MCP: la entrega solo
          ocurre con el pago completado y el face match aprobado.
        </Notice>
      </div>

      {r.cancelada_motivo && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warning">
            <strong>{r.estado === 'cancelada' ? 'Cancelada:' : 'Nota:'}</strong> {r.cancelada_motivo}
          </Notice>
        </div>
      )}

      <div className="grid-2">
        <div className="stack">
          <Card title="Línea de tiempo en Open Payments" hint="Identificadores para auditar cada paso">
            <Timeline steps={r.timeline} />
          </Card>

          {r.disputa && (
            <Card title="Disputa" actions={<span className="badge badge--warning">{r.disputa.estado === 'abierta' ? 'Abierta' : r.disputa.estado}</span>}>
              <DefList
                items={[
                  ['Abierta por', r.disputa.abierta_por],
                  ['Fecha', dateTime(r.disputa.abierta_en)],
                  ['Motivo', r.disputa.motivo],
                ]}
              />
              <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Evidencia ({r.disputa.evidencias.length})</h3>
              {r.disputa.evidencias.length === 0 ? (
                <p className="muted">Aún no se ha adjuntado evidencia.</p>
              ) : (
                <ul className="list">
                  {r.disputa.evidencias.map((e, i) => (
                    <li key={i}>
                      <div className="grow">
                        <span className="title" style={{ fontSize: 14 }}>{e.texto}</span>
                        <span className="sub">
                          {e.autor} · {dateTime(e.ts)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="stack">
          <Card title="Resumen">
            <DefList
              items={[
                ['Persona', persona && <Link key="p" to={`/personas/${persona.id}`}>{persona.nombre}</Link>],
                ['Tienda', tienda && <Link key="t" to={`/tiendas/${tienda.id}`}>{tienda.nombre}</Link>],
                ['Monto', <span key="m" className="mono">{cop(r.monto_cop)}</span>],
                ['Riesgo', r.riesgo_ok ? <span key="r" className="badge badge--success">Permitido</span> : <span key="r" className="badge badge--neutral">Pendiente</span>],
                [
                  'Face match',
                  r.timeline.find((s) => s.key === 'facematch')?.estado === 'fallido' ? (
                    <span key="f" className="badge badge--danger">No coincide</span>
                  ) : r.face_match_ok ? (
                    <span key="f" className="badge badge--success">Aprobado</span>
                  ) : (
                    <span key="f" className="badge badge--neutral">Pendiente</span>
                  ),
                ],
                ['Código de entrega', <span key="c" className="mono muted">••••</span>],
                ['Creada', dateTime(r.creada_en)],
                ['Vence', dateTime(r.vence_en)],
              ]}
            />
          </Card>

          {r.remesa && (
            <Card title="Remesa en dólares" hint="Quote con conversión a COP">
              <DefList
                items={[
                  ['Quien paga', r.remesa.origen],
                  ['Débito', <span key="d" className="mono">USD {r.remesa.usd.toFixed(2)}</span>],
                  ['Tasa', <span key="t" className="mono">{r.remesa.tasa.toLocaleString('es-CO')} COP/USD</span>],
                  ['Comisión', <span key="c" className="mono">USD {r.remesa.comision.toFixed(2)}</span>],
                  ['Recibe en tienda', <span key="r" className="mono">{cop(r.monto_cop)}</span>],
                ]}
              />
            </Card>
          )}
        </div>
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
