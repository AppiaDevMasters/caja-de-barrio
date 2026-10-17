import { Link, useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from './primitives';

/**
 * Tabla densa. columns: [{ key, header, render(row), className, primary }]
 * `rowHref(row)` vuelve clicable la fila; la columna `primary` lleva el enlace
 * accesible (teclado y lectores de pantalla).
 */
export default function DataTable({ columns, rows, rowKey = (r) => r.id, rowHref, loading, footer, emptyTitle }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="table-wrap" aria-busy="true">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c, j) => (
                  <td key={c.key}>
                    <span className="skeleton" style={{ width: `${55 + ((i * 7 + j * 13) % 40)}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="table-wrap">
        <EmptyState icon={SearchX} title={emptyTitle || 'Sin resultados'}>
          Ajusta los filtros o la búsqueda para ver más registros.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.className}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr key={rowKey(row)} className={href ? 'is-link' : ''} onClick={href ? () => navigate(href) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.primary && href ? (
                      <Link to={href} className="row-link" onClick={(e) => e.stopPropagation()}>
                        {c.render(row)}
                      </Link>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footer && <div className="table-foot">{footer}</div>}
    </div>
  );
}
