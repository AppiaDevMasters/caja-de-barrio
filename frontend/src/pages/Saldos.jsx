import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getSaldos, useAdminQuery } from '../api';
import { cop, relative } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import { Chips, PageHeader, QueryError, SearchInput } from '../components/ui/primitives';

const TIPO_LABEL = { persona: 'Persona', tienda: 'Tienda' };
const rutaDe = (d) => `/${d.tipo === 'tienda' ? 'tiendas' : 'personas'}/${d.id}`;

export default function Saldos() {
  const [params, setParams] = useSearchParams();
  const { data, loading, error, refetch } = useAdminQuery('saldos', () => getSaldos());
  const tipo = params.get('tipo') || 'todos';
  const q = params.get('q') || '';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'todos') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const todas = data || [];
  const n = q.trim().toLowerCase();
  const rows = todas
    .filter((b) => tipo === 'todos' || b.duenio.tipo === tipo)
    .filter((b) => !n || `${b.duenio.nombre} ${b.wallet_address}`.toLowerCase().includes(n))
    .sort((a, b) => b.saldo_cop - a.saldo_cop);
  const total = rows.reduce((acc, b) => acc + (b.saldo_cop || 0), 0);
  const count = (t) => todas.filter((b) => b.duenio.tipo === t).length;

  const options = [
    { value: 'todos', label: 'Todas', count: todas.length },
    { value: 'persona', label: 'Personas', count: count('persona') },
    { value: 'tienda', label: 'Tiendas', count: count('tienda') },
  ];

  const columns = [
    { key: 'duenio', header: 'Dueño', primary: true, render: (b) => b.duenio.nombre },
    { key: 'tipo', header: 'Tipo', render: (b) => TIPO_LABEL[b.duenio.tipo] || b.duenio.tipo },
    {
      key: 'wallet',
      header: 'Wallet address',
      render: (b) => <span className="mono" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{b.wallet_address}</span>,
    },
    { key: 'saldo', header: 'Saldo', className: 'num', render: (b) => cop(b.saldo_cop || 0) },
    { key: 'ultimo', header: 'Último movimiento', render: (b) => (b.ultimo_movimiento_en ? relative(b.ultimo_movimiento_en) : <span className="muted">Sin movimientos</span>) },
    { key: 'go', header: '', render: () => <ChevronRight size={16} aria-hidden="true" className="muted" /> },
  ];

  return (
    <>
      <PageHeader
        title="Saldos"
        subtitle="Billeteras virtuales de personas y tiendas. Solo lectura: el panel no mueve saldo."
      />
      <QueryError error={error} onRetry={refetch} />
      <div className="filters">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Buscar por nombre o wallet" />
        <Chips label="Filtrar por tipo" options={options} value={tipo} onChange={(v) => set('tipo', v)} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b.wallet_address}
        loading={loading}
        rowHref={(b) => rutaDe(b.duenio)}
        emptyTitle="No hay billeteras con estos filtros"
        footer={`${rows.length} ${rows.length === 1 ? 'billetera' : 'billeteras'} · saldo total ${cop(total)}`}
      />
    </>
  );
}
