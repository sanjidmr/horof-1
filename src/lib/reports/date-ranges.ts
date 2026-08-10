export type ReportPreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export const REPORT_PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export interface ReportRange {
  from: string;
  to: string;
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function startOfYear(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(0);
  return x;
}

function fallbackRange(): ReportRange {
  const now = new Date();
  return {
    from: startOfDay(addDays(now, -29)).toISOString(),
    to: now.toISOString(),
    label: 'Last 30 Days',
  };
}

export function resolveReportRange(
  preset: ReportPreset,
  customFrom?: string,
  customTo?: string
): ReportRange {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: now.toISOString(), label: 'Today' };
    case 'yesterday': {
      const from = startOfDay(addDays(now, -1));
      return { from: from.toISOString(), to: startOfDay(now).toISOString(), label: 'Yesterday' };
    }
    case 'last7':
      return { from: startOfDay(addDays(now, -6)).toISOString(), to: now.toISOString(), label: 'Last 7 Days' };
    case 'this_week':
      return { from: startOfWeek(now).toISOString(), to: now.toISOString(), label: 'This Week' };
    case 'last_week': {
      const thisWeekStart = startOfWeek(now);
      return {
        from: startOfWeek(addDays(now, -7)).toISOString(),
        to: thisWeekStart.toISOString(),
        label: 'Last Week',
      };
    }
    case 'this_month':
      return { from: startOfMonth(now).toISOString(), to: now.toISOString(), label: 'This Month' };
    case 'last_month': {
      const from = startOfMonth(addMonths(now, -1));
      return { from: from.toISOString(), to: startOfMonth(now).toISOString(), label: 'Last Month' };
    }
    case 'this_year':
      return { from: startOfYear(now).toISOString(), to: now.toISOString(), label: 'This Year' };
    case 'custom': {
      const cf = customFrom && !isNaN(Date.parse(customFrom)) ? new Date(customFrom) : null;
      const ct = customTo && !isNaN(Date.parse(customTo)) ? new Date(customTo) : null;
      if (!cf || !ct) return fallbackRange();
      const from = startOfDay(cf);
      const to = endOfDay(ct);
      if (to < from) return { from: to.toISOString(), to: from.toISOString(), label: 'Custom Range' };
      return { from: from.toISOString(), to: to.toISOString(), label: 'Custom Range' };
    }
    default:
      return fallbackRange();
  }
}

export function presetLabel(preset: ReportPreset): string {
  const found = REPORT_PRESETS.find((p) => p.value === preset);
  return found ? found.label : 'Last 30 Days';
}
