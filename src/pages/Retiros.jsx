import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { filtrarRetiros, getRetiros, USE_MOCK, useAdminQuery } from '../api';
import { cop, relative } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { Chips, PageHeader, QueryError, SearchInput } from '../components/ui/primitives';

const bool = (v, yes, no) => (
  <span className={`badge badge--${v ? 'success' : 'neutral'}`}>{v ? yes : no}</span>
);

export default function Retiros() {
  const [params, setParams] = useSearchParams();
  const { data, loading, error, refetch } = useAdminQuery('retiros', () => getRetiros());
  const estado = params.get('estado') || 'todas';
  const q = params.get('q') || '';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'todas') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const base = data || [];
  const rows = filtrarRetiros(base, { estado, q });
  const count = (e) => base.filter((r) => r.estado === e).length;
  const options = [
    { value: 'todas', label: 'Todas', count: base.length },
    { value: 'reservada', label: 'Reservadas', count: count('reservada') },
    { value: 'pagada', label: 'Pagadas', count: count('pagada') },
    { value: 'entregada', label: 'Entregadas', count: count('entregada') },
    { value: 'en_disputa', label: 'En disputa', count: count('en_disputa') },
    { value: 'vencida', label: 'Vencidas', count: count('vencida') },
    { value: 'cancelada', label: 'Canceladas', count: count('cancelada') },
  ];

  const columns = [
    { key: 'id', header: 'Reserva', primary: true, render: (r) => <span className="mono">{r.id}</span> },
    { key: 'persona', header: 'Persona', render: (r) => r.nombre_cliente || '—' },
    { key: 'tienda', header: 'Tienda', render: (r) => r.nombre_tienda || '—' },
    { key: 'monto', header: 'Monto', className: 'num', render: (r) => cop(r.monto_cop) },
    { key: 'com_tendero', header: 'Comisión tendero', className: 'num', render: (r) => (r.total_cop ? cop(r.comision_tendero_cop) : '—') },
    { key: 'com_caja', header: '1 % Caja de Barrio', className: 'num', render: (r) => (r.total_cop ? cop(r.comision_plataforma_cop) : '—') },
    { key: 'estado', header: 'Estado', render: (r) => <StatusBadge kind="reserva" value={r.estado} /> },
    {
      key: 'identidad',
      header: 'Identidad',
      render: (r) =>
        r.timeline.find((s) => s.key === 'identidad')?.estado === 'fallido' ? (
          <span className="badge badge--danger">Rechazada</span>
        ) : (
          bool(r.face_match_ok, 'Verificada', 'Pendiente')
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
          <span className="status-chip" title={USE_MOCK ? 'Datos de demostración' : 'Datos en vivo del backend'}>
            <span className="dot" aria-hidden="true" /> {USE_MOCK ? 'En vivo (mock)' : 'En vivo'}
          </span>
        }
      />
      <QueryError error={error} onRetry={refetch} />
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
