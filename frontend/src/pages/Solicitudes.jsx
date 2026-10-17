import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useStoreState } from '../data/mockStore';
import { selectSolicitudes, semaforo } from '../api';
import { maskCedula, relative } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { Chips, PageHeader, SearchInput, useSimulatedLoad } from '../components/ui/primitives';

export function Semaforo({ solicitud }) {
  const s = semaforo(solicitud);
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }} aria-label={`${s.ok} en verde, ${s.alerta} en amarillo, ${s.error} en rojo`}>
      <span className="badge badge--success">{s.ok}</span>
      <span className={`badge badge--${s.alerta ? 'warning' : 'neutral'}`}>{s.alerta}</span>
      <span className={`badge badge--${s.error ? 'danger' : 'neutral'}`}>{s.error}</span>
    </span>
  );
}

export default function Solicitudes() {
  const state = useStoreState();
  const [params, setParams] = useSearchParams();
  const loading = useSimulatedLoad();
  const estado = params.get('estado') || 'en_revision';
  const q = params.get('q') || '';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || (key === 'estado' && value === 'en_revision')) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const rows = selectSolicitudes(state, { estado, q });
  const count = (e) => state.solicitudes.filter((x) => x.estado === e).length;
  const options = [
    { value: 'en_revision', label: 'En revisión', count: count('en_revision') },
    { value: 'correccion_pedida', label: 'Corrección pedida', count: count('correccion_pedida') },
    { value: 'verificando', label: 'Verificando', count: count('verificando') },
    { value: 'aprobada', label: 'Aprobadas', count: count('aprobada') },
    { value: 'rechazada', label: 'Rechazadas', count: count('rechazada') },
    { value: 'todas', label: 'Todas', count: state.solicitudes.length },
  ];

  const columns = [
    { key: 'fecha', header: 'Recibida', primary: true, render: (x) => relative(x.creada_en) },
    {
      key: 'solicitante',
      header: 'Solicitante',
      render: (x) => (
        <>
          {x.solicitante.nombre}
          <span className="cell-sub mono">{maskCedula(x.solicitante.cedula)}</span>
        </>
      ),
    },
    { key: 'tienda', header: 'Tienda', render: (x) => x.tienda.nombre },
    { key: 'barrio', header: 'Barrio', render: (x) => x.tienda.barrio },
    { key: 'estado', header: 'Estado', render: (x) => <StatusBadge kind="solicitud" value={x.estado} /> },
    { key: 'checks', header: 'Checks (ok · alerta · error)', render: (x) => <Semaforo solicitud={x} /> },
    { key: 'go', header: '', render: () => <ChevronRight size={16} aria-hidden="true" className="muted" /> },
  ];

  return (
    <>
      <PageHeader
        title="Solicitudes de tendero"
        subtitle="Quién entra a la red: las altas llegan por WhatsApp y se aprueban aquí. De la más antigua a la más reciente."
      />
      <div className="filters">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Buscar por solicitante, tienda o barrio" />
        <Chips label="Filtrar por estado" options={options} value={estado} onChange={(v) => set('estado', v)} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowHref={(x) => `/solicitudes/${x.id}`}
        emptyTitle="No hay solicitudes con estos filtros"
        footer={`${rows.length} ${rows.length === 1 ? 'solicitud' : 'solicitudes'}`}
      />
    </>
  );
}
