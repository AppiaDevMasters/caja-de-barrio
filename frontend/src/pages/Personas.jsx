import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { contarPersonasPorEstado, filtrarPersonas, getPersonas, useAdminQuery } from '../api';
import { maskCedula, relative } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { Chips, PageHeader, QueryError, SearchInput } from '../components/ui/primitives';

export default function Personas() {
  const [params, setParams] = useSearchParams();
  const { data, loading, error, refetch } = useAdminQuery('personas', () => getPersonas());
  const estado = params.get('estado') || 'todas';
  const q = params.get('q') || '';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'todas') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const todas = data || [];
  const counts = contarPersonasPorEstado(todas);
  const rows = filtrarPersonas(todas, { estado, q });
  const cola = estado === 'revision_manual';

  const options = [
    { value: 'revision_manual', label: 'Revisión manual', count: counts.revision_manual || 0 },
    { value: 'todas', label: 'Todas', count: todas.length },
    { value: 'verificando', label: 'Verificando', count: counts.verificando || 0 },
    { value: 'pendiente', label: 'Pendientes', count: counts.pendiente || 0 },
    { value: 'aprobada', label: 'Aprobadas', count: counts.aprobada || 0 },
    { value: 'bloqueada', label: 'Bloqueadas', count: counts.bloqueada || 0 },
    { value: 'rechazada', label: 'Rechazadas', count: counts.rechazada || 0 },
  ];

  const columns = [
    {
      key: 'nombre',
      header: 'Persona',
      primary: true,
      render: (p) => (
        <>
          {p.nombre}
          <span className="cell-sub mono">{maskCedula(p.cedula)}</span>
        </>
      ),
    },
    { key: 'estado', header: 'Estado', render: (p) => <StatusBadge kind="persona" value={p.estado_registro} /> },
    { key: 'nivel', header: 'Nivel', render: (p) => p.nivel || '—' },
    {
      key: 'motivo',
      header: cola ? 'Motivo de revisión' : 'Último movimiento',
      render: (p) => (
        <span className="muted" style={{ display: 'block', maxWidth: 420, minWidth: 200 }}>
          {p.motivo_revision || p.historial?.[0]?.motivo || 'Sin movimientos'}
        </span>
      ),
    },
    { key: 'registro', header: cola ? 'En cola desde' : 'Registro', render: (p) => relative(p.creada_en) },
    { key: 'go', header: '', render: () => <ChevronRight size={16} aria-hidden="true" className="muted" /> },
  ];

  return (
    <>
      <PageHeader
        title="Personas"
        subtitle="Cada registro pasa por un estado de verificación con autor y motivo."
      />
      <QueryError error={error} onRetry={refetch} />
      <div className="filters">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Buscar por nombre o últimos dígitos de cédula" />
        <Chips label="Filtrar por estado" options={options} value={estado} onChange={(v) => set('estado', v)} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowHref={(p) => `/personas/${p.id}`}
        emptyTitle="No hay personas con estos filtros"
        footer={`${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}${cola ? ' · ordenados por antigüedad' : ''}`}
      />
    </>
  );
}
