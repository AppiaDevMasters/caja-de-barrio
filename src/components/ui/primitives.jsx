import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Circle, Check, Info, Minus, Search, TriangleAlert, X } from 'lucide-react';
import { dateTime } from '../../utils/format';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function Card({ title, hint, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {hint && <span className="hint">{hint}</span>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function DefList({ items }) {
  return (
    <dl className="dl">
      {items
        .filter((i) => i)
        .map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="n">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="search">
      <Search size={16} aria-hidden="true" />
      <input
        className="input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <select
      className="select select-inline"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function EmptyState({ icon: Icon = Info, title, children }) {
  return (
    <div className="empty">
      <Icon size={36} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Notice({ tone, icon: Icon = Info, children }) {
  return (
    <div className={`notice ${tone ? `notice--${tone}` : ''}`}>
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Forbidden() {
  return (
    <EmptyState icon={TriangleAlert} title="No tienes acceso a esta sección">
      Tu rol no incluye este módulo. Si crees que es un error, habla con un superadministrador.
    </EmptyState>
  );
}

/** Estado de carga simulado para mostrar skeletons al entrar a una lista. */
export function useSimulatedLoad(ms = 320) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

const STEP_ICON = { ok: Check, pendiente: Circle, fallido: X, omitido: Minus };

export function Timeline({ steps }) {
  return (
    <ol className="timeline">
      {steps.map((s) => {
        const Icon = STEP_ICON[s.estado];
        const cls = { ok: 'is-ok', pendiente: 'is-pending', fallido: 'is-fail', omitido: 'is-skip' }[s.estado];
        return (
          <li key={s.key} className={`tl-item ${cls}`}>
            <span className="tl-dot">
              <Icon size={14} aria-hidden="true" />
            </span>
            <div>
              <div className="tl-title">
                {s.label}
                {s.estado === 'pendiente' && <span className="badge badge--primary">En curso</span>}
                {s.estado === 'fallido' && <span className="badge badge--danger">Falló</span>}
                {s.estado === 'omitido' && <span className="badge badge--neutral">No ejecutado</span>}
                {s.ts && <time dateTime={s.ts}>{dateTime(s.ts)}</time>}
              </div>
              {s.detalle && <p className="tl-detail">{s.detalle}</p>}
              {s.ref && <code className="tl-ref">{s.ref}</code>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
