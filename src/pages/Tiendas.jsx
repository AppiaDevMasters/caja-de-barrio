import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Download, Star } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useStoreState } from '../data/mockStore';
import { efectivoLibre, selectTiendas, tiendasVisibles } from '../api';
import { cop, downloadCSV } from '../utils/format';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { PageHeader, SearchInput, Select, useSimulatedLoad } from '../components/ui/primitives';

export default function Tiendas() {
  const { user } = useAuth();
  const state = useStoreState();
  const [params, setParams] = useSearchParams();
  const loading = useSimulatedLoad();
  const f = {
    nivel: params.get('nivel') || 'todos',
    estado: params.get('estado') || 'todos',
    barrio: params.get('barrio') || 'todos',
    reputacion: params.get('reputacion') || 'todas',
    q: params.get('q') || '',
  };

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || ['todos', 'todas'].includes(value)) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const base = tiendasVisibles(state, user);
  const barrios = [...new Set(base.map((t) => t.barrio))].sort();
  const rows = selectTiendas(state, user, f);

  const exportar = () =>
    downloadCSV(
      'tiendas-caja-de-barrio.csv',
      rows.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        barrio: t.barrio,
        nivel: t.nivel,
        estado: t.estado,
        tope_retiro_cop: t.tope_retiro_cop,
        efectivo_libre_cop: efectivoLibre(t),
        reputacion: t.reputacion,
        entregas_completadas: t.entregas_completadas,
        reclamos: t.reclamos,
      }))
    );

  const columns = [
    {
      key: 'nombre',
      header: 'Tienda',
      primary: true,
      render: (t) => (
        <>
          {t.nombre}
          <span className="cell-sub">{t.barrio}</span>
        </>
      ),
    },
    { key: 'nivel', header: 'Nivel', render: (t) => <StatusBadge kind="nivel" value={t.nivel} /> },
    { key: 'estado', header: 'Estado', render: (t) => <StatusBadge kind="tienda" value={t.estado} /> },
    { key: 'efectivo', header: 'Efectivo libre', className: 'num', render: (t) => cop(efectivoLibre(t)) },
    { key: 'tope', header: 'Tope retiro', className: 'num', render: (t) => cop(t.tope_retiro_cop) },
    {
      key: 'rep',
      header: 'Reputación',
      render: (t) =>
        t.reputacion > 0 ? (
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Star size={14} aria-hidden="true" style={{ color: 'var(--c-primary)', fill: 'var(--c-primary)' }} />
            <span className="mono">{t.reputacion.toFixed(1)}</span>
          </span>
        ) : (
          <span className="muted">Sin datos</span>
        ),
    },
    { key: 'reclamos', header: 'Reclamos', className: 'num', render: (t) => t.reclamos },
    { key: 'go', header: '', render: () => <ChevronRight size={16} aria-hidden="true" className="muted" /> },
  ];

  return (
    <>
      <PageHeader
        title="Tiendas"
        subtitle={user.rol === 'aliado' ? 'Tiendas de tu red · solo lectura y exportación.' : 'Red de tiendas que entregan efectivo en el barrio.'}
        actions={
          <button className="btn" onClick={exportar} disabled={!rows.length}>
            <Download size={16} /> Exportar CSV
          </button>
        }
      />
      <div className="filters">
        <SearchInput value={f.q} onChange={(v) => set('q', v)} placeholder="Buscar tienda o barrio" />
        <Select
          label="Nivel"
          value={f.nivel}
          onChange={(v) => set('nivel', v)}
          options={[
            { value: 'todos', label: 'Todos los niveles' },
            { value: 'basico', label: 'Básico' },
            { value: 'comercio', label: 'Comercio' },
            { value: 'aliado', label: 'Aliado' },
          ]}
        />
        <Select
          label="Estado"
          value={f.estado}
          onChange={(v) => set('estado', v)}
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'activa', label: 'Activa' },
            { value: 'suspendida', label: 'Suspendida' },
          ]}
        />
        <Select
          label="Barrio"
          value={f.barrio}
          onChange={(v) => set('barrio', v)}
          options={[{ value: 'todos', label: 'Todos los barrios' }, ...barrios.map((b) => ({ value: b, label: b }))]}
        />
        <Select
          label="Reputación"
          value={f.reputacion}
          onChange={(v) => set('reputacion', v)}
          options={[
            { value: 'todas', label: 'Cualquier reputación' },
            { value: 'alta', label: '4.5 o más' },
            { value: 'media', label: '4.0 a 4.4' },
            { value: 'baja', label: 'Menos de 4.0' },
          ]}
        />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowHref={(t) => `/tiendas/${t.id}`}
        emptyTitle="No hay tiendas con estos filtros"
        footer={`${rows.length} de ${base.length} tiendas`}
      />
    </>
  );
}
