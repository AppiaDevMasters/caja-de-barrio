export const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
export const minutesFromNow = (m) => new Date(Date.now() + m * 60000).toISOString();
export const daysAgo = (d) => minutesAgo(d * 1440);

// Identificadores falsos y estables (no son llaves reales de Open Payments).
export function fakeId(seed, salt = '') {
  let h = 2166136261;
  const s = `${seed}:${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const part = (n) => (Math.abs(Math.imul(h, n)) >>> 0).toString(16).padStart(8, '0');
  return `${part(2654435761)}-${part(40503).slice(0, 4)}-${part(97).slice(0, 4)}-${part(31).slice(0, 4)}-${part(7919)}${part(13).slice(0, 4)}`;
}
