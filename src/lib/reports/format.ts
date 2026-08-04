const CURRENCY = '\u09F3';

export function formatCurrency(value: number | null | undefined, compact = false): string {
  const n = Number(value || 0);
  if (compact) {
    if (Math.abs(n) >= 10000000) return `${CURRENCY}${(n / 10000000).toFixed(2)}Cr`;
    if (Math.abs(n) >= 100000) return `${CURRENCY}${(n / 100000).toFixed(2)}L`;
    if (Math.abs(n) >= 1000) return `${CURRENCY}${(n / 1000).toFixed(1)}K`;
    return `${CURRENCY}${n.toFixed(0)}`;
  }
  return `${CURRENCY}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  const n = Number(value || 0);
  return `${n.toFixed(digits)}%`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHour(hour: number): string {
  const h = hour % 24;
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}

export function formatMonthKey(month: string): string {
  // month key is YYYY-MM
  const parts = String(month).split('-');
  if (parts.length !== 2) return String(month);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(parts[1]) - 1;
  return `${names[idx] || parts[1]} ${parts[0]}`;
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
