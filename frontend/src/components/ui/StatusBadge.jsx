const MAP = {
  persona: {
    pendiente: ['Pendiente', 'neutral'],
    verificando: ['Verificando', 'info'],
    revision_manual: ['Revisión manual', 'warning'],
    aprobada: ['Aprobada', 'success'],
    rechazada: ['Rechazada', 'danger'],
    bloqueada: ['Bloqueada', 'danger'],
  },
  tienda: {
    activa: ['Activa', 'success'],
    suspendida: ['Suspendida', 'danger'],
    inactiva: ['Suspendida', 'danger'], // el backend llama `inactiva` a la tienda suspendida
    revision_manual: ['Revisión manual', 'warning'],
    pendiente: ['En alta', 'warning'],
    pendiente_verificacion: ['Pendiente de verificación', 'warning'],
  },
  nivel: {
    basico: ['Básico', 'neutral'],
    comercio: ['Comercio', 'info'],
    aliado: ['Aliado', 'primary'],
  },
  reserva: {
    reservada: ['Reservada', 'info'],
    pagada: ['Pagada', 'primary'],
    entregada: ['Entregada', 'success'],
    vencida: ['Vencida', 'neutral'],
    cancelada: ['Cancelada', 'neutral'],
    en_disputa: ['En disputa', 'warning'],
  },
  solicitud: {
    verificando: ['Verificando', 'info'],
    en_revision: ['En revisión', 'warning'],
    correccion_pedida: ['Corrección pedida', 'neutral'],
    aprobada: ['Aprobada', 'success'],
    rechazada: ['Rechazada', 'danger'],
  },
  check: {
    ok: ['OK', 'success'],
    alerta: ['Alerta', 'warning'],
    error: ['Error', 'danger'],
  },
  alerta: {
    abierta: ['Abierta', 'danger'],
    resuelta: ['Resuelta', 'success'],
    escalada: ['Escalada', 'warning'],
    descartada: ['Descartada', 'neutral'],
    bloqueada: ['Bloqueo aplicado', 'success'],
  },
  severidad: {
    alta: ['Severidad alta', 'danger'],
    media: ['Severidad media', 'warning'],
    baja: ['Severidad baja', 'neutral'],
  },
  aprobacion: {
    pendiente: ['Pendiente', 'warning'],
    aprobada: ['Aprobada', 'success'],
    rechazada: ['Rechazada', 'danger'],
  },
};

export const labelOf = (kind, value) => MAP[kind]?.[value]?.[0] ?? value;

export default function StatusBadge({ kind, value }) {
  const [label, tone] = MAP[kind]?.[value] || [value, 'neutral'];
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
