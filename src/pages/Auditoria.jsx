import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { selectAuditoria } from '../api/admin';
import { useStoreState } from '../data/mockStore';
import { ROLE_LABEL } from '../auth/permissions';
import { dateTime } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import { Notice, PageHeader, SearchInput, Select, useSimulatedLoad } from '../components/ui/primitives';

const ENTIDADES = {
  persona: 'Persona',
  tienda: 'Tienda',
  reserva: 'Reserva',
  alerta: 'Alerta',
  configuracion: 'Configuración',
};

export default function Auditoria() {
  const state = useStoreState();
  const loading = useSimulatedLoad();
  const [params, setParams] = useSearchParams();
  const f = {
    actor: params.get('actor') || 'todos',
    accion: params.get('accion') || 'todas',
    entidad: params.get('entidad') || 'todas',
    q: params.get('q') || '',
  };
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || ['todos', 'todas'].includes(value)) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const actores = [...new Set(state.auditoria.map((a) => a.actor))].sort();
  const acciones = [...new Set(state.auditoria.map((a) => a.accion))].sort();
  const rows = selectAuditoria(state, f);

  const columns = [
    { key: 'ts', header: 'Fecha', render: (a) => <span style={{ whiteSpace: 'nowrap' }}>{dateTime(a.ts)}</span> },
    {
      key: 'actor',
      header: 'Usuario',
      render: (a) => (
        <>
          {a.actor}
          <span className="cell-sub">{ROLE_LABEL[a.rol]}</span>
        </>
      ),
    },
    { key: 'accion', header: 'Acción', render: (a) => <span className="mono">{a.accion}</span> },
    {
      key: 'entidad',
      header: 'Registro',
      render: (a) => (
        <>
          {a.entidad_nombre}
          <span className="cell-sub mono">
            {ENTIDADES[a.entidad_tipo]} · {a.entidad_id.length > 24 ? `${a.entidad_id.slice(0, 24)}…` : a.entidad_id}
          </span>
        </>
      ),
    },
    {
      key: 'antes',
      header: 'Antes',
      render: (a) => (
        <span className="mono muted" style={{ whiteSpace: 'pre-wrap', display: 'block', minWidth: 120 }}>
          {a.antes}
        </span>
      ),
    },
    {
      key: 'despues',
      header: 'Después',
      render: (a) => (
        <span className="mono" style={{ whiteSpace: 'pre-wrap', display: 'block', minWidth: 120 }}>
          {a.despues}
        </span>
      ),
    },
    {
      key: 'motivo',
      header: 'Motivo',
      render: (a) => <span style={{ display: 'block', minWidth: 240, maxWidth: 380 }}>{a.motivo}</span>,
    },
    { key: 'ip', header: 'IP', render: (a) => <span className="mono muted">{a.ip}</span> },
  ];

  return (
    <>
      <PageHeader title="Auditoría" subtitle="Quién, cuándo, desde dónde, sobre qué, valor anterior, valor nuevo y motivo." />
      <div style={{ marginBottom: 12 }}>
        <Notice icon={Lock}>
          Registro de solo lectura e inmutable: no se puede editar ni borrar, ni siquiera por el superadministrador.
        </Notice>
      </div>
      <div className="filters">
        <SearchInput value={f.q} onChange={(v) => set('q', v)} placeholder="Buscar por registro, ID o motivo" />
        <Select
          label="Usuario"
          value={f.actor}
          onChange={(v) => set('actor', v)}
          options={[{ value: 'todos', label: 'Todos los usuarios' }, ...actores.map((a) => ({ value: a, label: a }))]}
        />
        <Select
          label="Acción"
          value={f.accion}
          onChange={(v) => set('accion', v)}
          options={[{ value: 'todas', label: 'Todas las acciones' }, ...acciones.map((a) => ({ value: a, label: a }))]}
        />
        <Select
          label="Tipo de registro"
          value={f.entidad}
          onChange={(v) => set('entidad', v)}
          options={[{ value: 'todas', label: 'Todos los registros' }, ...Object.entries(ENTIDADES).map(([value, label]) => ({ value, label }))]}
        />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle="Sin eventos con estos filtros"
        footer={`${rows.length} de ${state.auditoria.length} eventos`}
      />
    </>
  );
}
