const copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const numFmt = new Intl.NumberFormat('es-CO');

export const cop = (n) => copFmt.format(n || 0).replace(/\s/g, '');
export const num = (n) => numFmt.format(n || 0);

const dtFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const timeFmt = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const dateTime = (iso) => (iso ? dtFmt.format(new Date(iso)) : '—');
export const timeOnly = (iso) => (iso ? timeFmt.format(new Date(iso)) : '—');

export function relative(iso) {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  let text;
  if (min < 1) text = 'menos de 1 min';
  else if (min < 60) text = `${min} min`;
  else if (min < 60 * 24) text = `${Math.round(min / 60)} h`;
  else text = `${Math.round(min / 1440)} d`;
  if (min < 1) return 'ahora';
  return diffMs < 0 ? `hace ${text}` : `en ${text}`;
}

export const maskCedula = (c) => `****${String(c).replace(/\D/g, '').slice(-4)}`;
export const maskPhone = (p) => `+57 *** *** ${String(p).replace(/\D/g, '').slice(-4)}`;

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
  const blob = new Blob(['\ufeff' + body.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
