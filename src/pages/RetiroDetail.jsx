import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FilePlus2, Gavel, Scale, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin } from '../api';
import { useStoreState } from '../data/mockStore';
import { cop, dateTime, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import StatusBadge from '../components/ui/StatusBadge';
import { BackLink, Card, DefList, EmptyState, Notice, Timeline } from '../components/ui/primitives';

const EVENTO_LABEL = {
  aviso_tendero: 'Aviso al tendero',
  aviso_pago: 'Aviso de pago',
  entrega_tendero: 'Entrega del tendero',
  disputa_abierta: 'Disputa del cliente',
  vencimiento: 'Vencimiento',
  accion_panel: 'Acción del panel',
};

const pctFmt = (n) => `${(n * 100).toString().replace('.', ',')} %`;

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
  const identidad = r.timeline.find((s) => s.key === 'identidad');
  const puedeCancelar = r.estado === 'reservada' && can(user.rol, 'reserva.cancelar');
  const puedeDisputa = ['pagada', 'entregada', 'vencida'].includes(r.estado) && can(user.rol, 'retiro.disputa');
  const puedeEvidencia = r.estado === 'en_disputa' && can(user.rol, 'retiro.disputa');
  const puedeResolver =
    r.estado === 'en_disputa' && r.disputa?.estado === 'abierta' && can(user.rol, 'retiro.resolver_disputa');
  const conCobros = r.total_cop > 0;

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
              className="btn"
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
          {puedeResolver && (
            <button
              className="btn btn--primary"
              onClick={() =>
                setDlg({
                  title: 'Resolver disputa',
                  description:
                    'Solo cambia el estado y deja auditoría. No mueve dinero: cualquier ajuste se hace fuera del panel.',
                  confirmLabel: 'Resolver disputa',
                  motivoLabel: 'Motivo de la resolución (obligatorio)',
                  successMsg: (res) =>
                    `Disputa resuelta a favor del ${res.resolucion === 'cliente' ? 'cliente' : 'tendero'}.`,
                  fields: [
                    {
                      name: 'resolucion',
                      label: 'Resolución',
                      type: 'select',
                      defaultValue: 'tendero',
                      options: [
                        { value: 'tendero', label: 'A favor del tendero (entrega válida)' },
                        { value: 'cliente', label: 'A favor del cliente (no recibió)' },
                      ],
                    },
                  ],
                  run: ({ motivo, values }) => admin.resolverDisputa(r.id, values.resolucion, motivo),
                })
              }
            >
              <Scale size={16} /> Resolver disputa
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Notice icon={ShieldCheck}>
          Este panel no puede marcar pagos ni entregar billetes. Esas reglas viven en el backend: la entrega se cierra solo con
          el pago completado y la doble confirmación del tendero y del cliente.
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

          <Card title="Actividad" hint="Avisos del agente, acciones del panel y vencimientos">
            {r.eventos.length === 0 ? (
              <p className="muted">Sin eventos registrados.</p>
            ) : (
              <ul className="list">
                {r.eventos.map((e, i) => (
                  <li key={i} style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <span className="title" style={{ fontSize: 14 }}>
                        {EVENTO_LABEL[e.tipo] || e.tipo}
                      </span>
                      <span className="sub">{e.detalle}</span>
                      <span className="sub" style={{ display: 'block' }}>
                        {e.actor} · {dateTime(e.ts)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {r.disputa && (
            <Card
              title="Disputa"
              actions={
                r.disputa.estado === 'abierta' ? (
                  <span className="badge badge--warning">Abierta</span>
                ) : (
                  <span className="badge badge--success">
                    Resuelta a favor del {r.disputa.resolucion === 'cliente' ? 'cliente' : 'tendero'}
                  </span>
                )
              }
            >
              <DefList
                items={[
                  ['Abierta por', r.disputa.abierta_por],
                  ['Fecha', dateTime(r.disputa.abierta_en)],
                  ['Motivo', r.disputa.motivo],
                  r.disputa.estado === 'resuelta' && ['Resuelta por', `${r.disputa.resuelta_por} · ${dateTime(r.disputa.resuelta_en)}`],
                  r.disputa.estado === 'resuelta' && ['Motivo de la resolución', r.disputa.resolucion_motivo],
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
                  'Identidad (Didit)',
                  identidad?.estado === 'fallido' ? (
                    <span key="f" className="badge badge--danger">Rechazada</span>
                  ) : r.face_match_ok ? (
                    <span key="f" className="badge badge--success">Verificada</span>
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

          <Card title="Comisiones" hint="Dos cobros separados">
            {conCobros ? (
              <DefList
                items={[
                  ['Efectivo libre al reservar', <span key="l" className="mono">{cop(r.efectivo_libre_al_reservar_cop)}</span>],
                  ['Tasa del tendero', <span key="t" className="mono">{pctFmt(r.tasa_tendero)}</span>],
                  ['Comisión tendero', <span key="ct" className="mono">{cop(r.comision_tendero_cop)}</span>],
                  ['1 % Caja de Barrio', <span key="cp" className="mono">{cop(r.comision_plataforma_cop)}</span>],
                  ['Total a debitar', <strong key="tot" className="mono">{cop(r.total_cop)}</strong>],
                ]}
              />
            ) : (
              <p className="muted">No se crearon cobros: el retiro se detuvo antes de reservar efectivo.</p>
            )}
          </Card>

          {r.remesa && (
            <Card title="Remesa en dólares" hint="Cotización con conversión a COP">
              <DefList
                items={[
                  ['Quien paga', r.remesa.origen],
                  ['Débito', <span key="d" className="mono">USD {r.remesa.usd.toFixed(2)}</span>],
                  ['Tasa', <span key="t" className="mono">{r.remesa.tasa.toLocaleString('es-CO')} COP/USD</span>],
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
