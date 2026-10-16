import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Check, ExternalLink, LockOpen, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { admin } from '../api/admin';
import { useStoreState } from '../data/mockStore';
import { TOPE_MAX_PERSONA } from '../data/mock/config';
import { REGLAS_ALERTA } from '../data/mock/alertas';
import { cop, dateTime, maskCedula, maskPhone, relative } from '../utils/format';
import ActionDialog from '../components/ui/ActionDialog';
import MaskField from '../components/ui/MaskField';
import StatusBadge from '../components/ui/StatusBadge';
import { BackLink, Card, DefList, EmptyState, Notice } from '../components/ui/primitives';

const tri = (v, yes, no, pending = 'Pendiente') =>
  v === null || v === undefined ? (
    <span className="badge badge--neutral">{pending}</span>
  ) : v ? (
    <span className="badge badge--success">{yes}</span>
  ) : (
    <span className="badge badge--danger">{no}</span>
  );

export default function PersonaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useStoreState();
  const [dlg, setDlg] = useState(null);
  const p = state.personas.find((x) => x.id === id);

  if (!p) {
    return (
      <>
        <BackLink to="/personas">Personas</BackLink>
        <EmptyState title="Persona no encontrada" />
      </>
    );
  }

  const est = p.estado_registro;
  const umbral = state.config.umbrales.diditScore;
  const retiros = state.reservas.filter((r) => r.persona_id === p.id);
  const alertas = state.alertas.filter((a) => a.persona_id === p.id);
  const desbloqueoPendiente = state.aprobaciones.find(
    (a) => a.estado === 'pendiente' && a.entidad.id === p.id
  );
  const compartido = state.personas.filter((x) => x.id !== p.id && x.dispositivo === p.dispositivo);

  const abrir = (cfg) => setDlg(cfg);

  const acciones = [];
  if (est === 'revision_manual') {
    if (can(user.rol, 'persona.aprobar'))
      acciones.push(
        <button key="ap" className="btn btn--primary" onClick={() =>
          abrir({
            title: 'Aprobar registro',
            description: `${p.nombre} podrá hacer retiros dentro de su nivel y tope.`,
            confirmLabel: 'Aprobar',
            successMsg: 'Registro aprobado.',
            run: ({ motivo }) => admin.aprobarPersona(p.id, motivo),
          })
        }>
          <Check size={16} /> Aprobar
        </button>
      );
    if (can(user.rol, 'persona.reintento'))
      acciones.push(
        <button key="re" className="btn" onClick={() =>
          abrir({
            title: 'Pedir nueva verificación',
            description: 'La persona volverá a «Pendiente» y se le pedirá repetir cédula y selfie por WhatsApp.',
            confirmLabel: 'Pedir reintento',
            successMsg: 'Reintento solicitado.',
            run: ({ motivo }) => admin.pedirReintento(p.id, motivo),
          })
        }>
          <RotateCcw size={16} /> Pedir reintento
        </button>
      );
    if (can(user.rol, 'persona.rechazar'))
      acciones.push(
        <button key="rj" className="btn btn--outline-danger" onClick={() =>
          abrir({
            title: 'Rechazar registro',
            description: 'El registro queda cerrado. Esta decisión se le avisa a la persona por WhatsApp.',
            tone: 'danger',
            confirmLabel: 'Rechazar registro',
            successMsg: 'Registro rechazado.',
            run: ({ motivo }) => admin.rechazarPersona(p.id, motivo),
          })
        }>
          <X size={16} /> Rechazar
        </button>
      );
  }
  if (est === 'aprobada' && can(user.rol, 'persona.bloquear')) {
    acciones.push(
      <button key="bl" className="btn btn--danger" onClick={() =>
        abrir({
          title: 'Bloquear persona',
          description: 'El agente dejará de atender retiros de esta persona de inmediato.',
          tone: 'danger',
          confirmLabel: 'Bloquear',
          successMsg: 'Persona bloqueada.',
          run: ({ motivo }) => admin.bloquearPersona(p.id, motivo),
        })
      }>
        <Ban size={16} /> Bloquear
      </button>
    );
  }
  if (est === 'bloqueada' && can(user.rol, 'persona.desbloquear') && !desbloqueoPendiente) {
    acciones.push(
      <button key="db" className="btn btn--primary" onClick={() =>
        abrir({
          title: 'Solicitar desbloqueo',
          description: 'Requiere cuatro ojos: tu solicitud cuenta como la primera firma y otra persona de cumplimiento debe aprobarla.',
          confirmLabel: 'Enviar a segunda aprobación',
          successMsg: (r) => `Solicitud ${r.aprobacion} creada. Falta la segunda firma.`,
          run: ({ motivo }) => admin.solicitarDesbloqueoPersona(p.id, motivo),
        })
      }>
        <LockOpen size={16} /> Solicitar desbloqueo
      </button>
    );
  }

  const max = TOPE_MAX_PERSONA[p.nivel];
  const puedeTope = can(user.rol, 'persona.tope') && est === 'aprobada';

  return (
    <>
      <BackLink to="/personas">Personas</BackLink>
      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {p.nombre} <StatusBadge kind="persona" value={est} />
          </h1>
          <p>
            <span className="mono">{p.id}</span> · {p.nivel} · registrada {relative(p.creada_en)}
          </p>
        </div>
        {acciones.length > 0 && <div className="page-actions">{acciones}</div>}
      </div>

      {est === 'revision_manual' && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warning">
            <strong>Enviada a revisión manual:</strong> {p.motivo_revision}
          </Notice>
        </div>
      )}
      {desbloqueoPendiente && (
        <div style={{ marginBottom: 16 }}>
          <Notice>
            Desbloqueo en espera de segunda firma ({desbloqueoPendiente.id}, iniciada por{' '}
            {desbloqueoPendiente.firmas[0].nombre}). Revisa «Aprobaciones» en la barra superior.
          </Notice>
        </div>
      )}
      {acciones.length === 0 && !['aprobada', 'bloqueada'].includes(est) && est !== 'revision_manual' && (
        <div style={{ marginBottom: 16 }}>
          <Notice>
            {est === 'rechazada'
              ? 'El registro fue rechazado: no admite más acciones.'
              : 'El registro está en curso (flujo automático). Aparecerá en la cola solo si alguna verificación falla.'}
          </Notice>
        </div>
      )}

      <div className="grid-2">
        <div className="stack">
          <Card title="Datos básicos" hint="Enmascarados por defecto · revelar queda en auditoría">
            <DefList
              items={[
                ['Cédula', <MaskField key="c" masked={maskCedula(p.cedula)} entity="persona" entityId={p.id} field="cedula" />],
                ['WhatsApp', <MaskField key="w" masked={maskPhone(p.whatsapp)} entity="persona" entityId={p.id} field="whatsapp" />],
                ['Wallet', p.wallet ? <span className="mono">{p.wallet}</span> : <span className="muted">Sin wallet registrada</span>],
                ['Registro', dateTime(p.creada_en)],
                ['Verificada', p.verificada_en ? dateTime(p.verificada_en) : '—'],
                ['Dispositivo', <span key="d" className="mono">{p.dispositivo}</span>],
              ]}
            />
            {compartido.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <Notice tone="warning">
                  Este dispositivo también aparece en: {compartido.map((x) => x.nombre).join(', ')}.
                </Notice>
              </div>
            )}
          </Card>

          <Card title="Verificaciones" hint="No se guardan selfies ni fotos del documento">
            <div className="split">
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Verifik · cédula</h3>
                <DefList
                  items={[
                    ['Cédula válida', tri(p.verifik.valida, 'Válida', 'No válida')],
                    ['Nombre', tri(p.verifik.nombre_coincide, 'Coincide', 'No coincide')],
                    p.verifik.nombre_registrado && ['Según Verifik', <span key="n" className="mono">{p.verifik.nombre_registrado}</span>],
                  ]}
                />
              </div>
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Didit · cara</h3>
                <DefList
                  items={[
                    [
                      'Prueba de vida',
                      p.didit.liveness === 'aprobada' ? (
                        <span className="badge badge--success">Aprobada</span>
                      ) : p.didit.liveness === 'fallida' ? (
                        <span className="badge badge--danger">Fallida</span>
                      ) : (
                        <span className="badge badge--neutral">Pendiente</span>
                      ),
                    ],
                    [
                      'Score',
                      p.didit.score === null ? (
                        '—'
                      ) : (
                        <span className="mono">
                          {p.didit.score.toFixed(2)}{' '}
                          <span className={p.didit.score >= umbral ? 'badge badge--success' : 'badge badge--danger'}>
                            umbral {umbral.toFixed(2)}
                          </span>
                        </span>
                      ),
                    ],
                    p.didit_ref && [
                      'Sesión',
                      <a key="s" href={`https://business.didit.me/sessions/${p.didit_ref}`} target="_blank" rel="noopener noreferrer">
                        Abrir en Didit <ExternalLink size={13} style={{ verticalAlign: '-2px' }} />
                      </a>,
                    ],
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card title="Listas restrictivas y PEP">
            <DefList
              items={[
                ['Listas restrictivas', tri(p.listas.restrictivas ? false : true, 'Sin coincidencias', 'Con coincidencia')],
                ['Persona expuesta (PEP)', tri(p.listas.pep ? false : true, 'Sin coincidencias', 'Coincidencia')],
                ['Teléfono único', tri(p.telefono_unico, 'No está en otra cuenta', 'Duplicado')],
                p.listas.detalle && ['Detalle', p.listas.detalle],
              ]}
            />
          </Card>

          <Card title="Historial de retiros" hint={`${retiros.length} en total`}>
            {retiros.length === 0 ? (
              <p className="muted">Sin retiros todavía.</p>
            ) : (
              <ul className="list">
                {retiros.map((r) => (
                  <li key={r.id}>
                    <div className="grow">
                      <Link className="title row-link mono" to={`/retiros/${r.id}`}>
                        {r.id}
                      </Link>
                      <span className="sub">
                        {state.tiendas.find((t) => t.id === r.tienda_id)?.nombre} · {relative(r.creada_en)}
                      </span>
                    </div>
                    <span className="mono">{cop(r.monto_cop)}</span>
                    <StatusBadge kind="reserva" value={r.estado} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card
            title="Nivel y tope"
            actions={
              puedeTope && (
                <button
                  className="btn btn--sm"
                  onClick={() =>
                    abrir({
                      title: 'Ajustar tope por retiro',
                      description: `Dentro del límite del ${p.nivel}: hasta ${cop(max)}.`,
                      confirmLabel: 'Guardar tope',
                      successMsg: 'Tope actualizado.',
                      fields: [{ name: 'valor', label: 'Nuevo tope (COP)', type: 'number', min: 1, max, defaultValue: p.tope_retiro_cop }],
                      run: ({ motivo, values }) => admin.ajustarTopePersona(p.id, values.valor, motivo),
                    })
                  }
                >
                  <SlidersHorizontal size={14} /> Ajustar
                </button>
              )
            }
          >
            <DefList
              items={[
                ['Nivel', p.nivel],
                ['Tope por retiro', <span key="t" className="mono">{cop(p.tope_retiro_cop)}</span>],
                ['Límite del nivel', <span key="l" className="mono">{cop(max)}</span>],
              ]}
            />
          </Card>

          <Card title="Alertas" hint={`${alertas.length} vinculadas`}>
            {alertas.length === 0 ? (
              <p className="muted">Sin alertas.</p>
            ) : (
              <ul className="list">
                {alertas.map((a) => (
                  <li key={a.id}>
                    <div className="grow">
                      <Link className="title row-link" to="/alertas?estado=todas">
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

          <Card title="Historial de revisiones" hint="Estado, autor y motivo">
            {p.historial.length === 0 ? (
              <p className="muted">Sin cambios de estado manuales.</p>
            ) : (
              <ul className="list">
                {p.historial.map((h, i) => (
                  <li key={i} style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <span className="title" style={{ fontSize: 14 }}>
                        {h.estado_anterior} → {h.estado_nuevo}
                      </span>
                      <span className="sub">
                        {h.actor} · {dateTime(h.ts)}
                      </span>
                      <span className="sub" style={{ display: 'block', marginTop: 4 }}>
                        «{h.motivo}»
                      </span>
                      {h.notificacion && (
                        <span className="sub" style={{ display: 'block', marginTop: 4 }}>
                          WhatsApp: «{h.notificacion}»
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ActionDialog config={dlg} onClose={() => setDlg(null)} />
    </>
  );
}
