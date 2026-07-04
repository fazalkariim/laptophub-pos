export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return `Rs ${n.toLocaleString()}`;
}