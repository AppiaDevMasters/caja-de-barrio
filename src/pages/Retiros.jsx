import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useStoreState } from '../data/mockStore';
import { selectReservas } from '../api/admin';
import { cop, relative } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { Chips, PageHeader, SearchInput, useSimulatedLoad } from '../components/ui/primitives';

const bool = (v, yes, no) => (
  <span className={`badge badge--${v ? 'success' : 'neutral'}`}>{v ? yes : no}</span>
);

export default function Retiros() {
  const state = useStoreState();
  const [params, setParams] = useSearchParams();
  const loading = useSimulatedLoad();
  const estado = params.get('estado') || 'todas';
  const q = params.get('q') || '';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'todas') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const rows = selectReservas(state, { estado, q });
  const count = (e) => state.reservas.filter((r) => r.estado === e).length;
  const options = [
    { value: 'todas', label: 'Todas', count: state.reservas.length },
    { value: 'reservada', label: 'Reservadas', count: count('reservada') },
    { value: 'pagada', label: 'Pagadas', count: count('pagada') },
    { value: 'entregada', label: 'Entregadas', count: count('entregada') },
    { value: 'en_disputa', label: 'En disputa', count: count('en_disputa') },
    { value: 'vencida', label: 'Vencidas', count: count('vencida') },
    { value: 'cancelada', label: 'Canceladas', count: count('cancelada') },
  ];

  const persona = (id) => state.personas.find((p) => p.id === id);
  const tienda = (id) => state.tiendas.find((t) => t.id === id);

  const columns = [
    { key: 'id', header: 'Reserva', primary: true, render: (r) => <span className="mono">{r.id}</span> },
    { key: 'persona', header: 'Persona', render: (r) => persona(r.persona_id)?.nombre },
    { key: 'tienda', header: 'Tienda', render: (r) => tienda(r.tienda_id)?.nombre },
    { key: 'monto', header: 'Monto', className: 'num', render: (r) => cop(r.monto_cop) },
    { key: 'estado', header: 'Estado', render: (r) => <StatusBadge kind="reserva" value={r.estado} /> },
    { key: 'riesgo', header: 'Riesgo', render: (r) => bool(r.riesgo_ok, 'Permitido', 'Pendiente') },
    {
      key: 'face',
      header: 'Face match',
      render: (r) =>
        r.timeline.find((s) => s.key === 'facematch')?.estado === 'fallido' ? (
          <span className="badge badge--danger">No coincide</span>
        ) : (
          bool(r.face_match_ok, 'Aprobado', 'Pendiente')
        ),
    },
    { key: 'creada', header: 'Creada', render: (r) => relative(r.creada_en) },
    { key: 'go', header: '', render: () => <ChevronRight size={16} aria-hidden="true" className="muted" /> },
  ];

  return (
    <>
      <PageHeader
        title="Reservas y retiros"
        subtitle="Cada retiro con su línea de tiempo en Open Payments."
        actions={
          <span className="status-chip" title="Datos de demostración">
            <span className="dot" aria-hidden="true" /> En vivo (mock)
          </span>
        }
      />
      <div className="filters">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Buscar por reserva, persona o tienda" />
        <Chips label="Filtrar por estado" options={options} value={estado} onChange={(v) => set('estado', v)} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowHref={(r) => `/retiros/${r.id}`}
        emptyTitle="No hay retiros con estos filtros"
        footer={`${rows.length} ${rows.length === 1 ? 'retiro' : 'retiros'}`}
      />
    </>
  );
}
