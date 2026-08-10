'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const CHART_COLORS = [
  '#1a4731',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#0ea5e9',
  '#f97316',
  '#14b8a6',
  '#64748b',
];

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  kind?: 'line' | 'bar' | 'area';
  format?: 'currency' | 'number' | 'percent';
}

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function valueText(v: number, format?: string): string {
  if (format === 'currency') return `\u09F3${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v)}`;
  if (format === 'percent') return `${v.toFixed(1)}%`;
  return new Intl.NumberFormat('en-US').format(v);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-xl">
      <p className="mb-1 text-[11px] font-bold text-slate-500">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-bold text-slate-800 tabular-nums">
            {valueText(Number(entry.value), entry.payload?.__format)}
          </span>
        </div>
      ))}
    </div>
  );
}

function axisTick(axisProps: any, format?: string) {
  const { x, y, payload } = axisProps;
  const text =
    format === 'currency' ? compactCurrency(Number(payload.value)) : String(payload.value);
  return (
    <text x={x} y={y} dy={10} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={600}>
      {text}
    </text>
  );
}

export function TrendChart({
  data,
  xKey,
  series,
  height = 280,
  format = 'currency',
}: {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  format?: 'currency' | 'number';
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={24} />
          <YAxis tick={(p: any) => axisTick(p, format)} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaTrendChart({
  data,
  xKey,
  series,
  height = 280,
  format = 'currency',
}: {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  format?: 'currency' | 'number';
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={24} />
          <YAxis tick={(p: any) => axisTick(p, format)} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              fill={`url(#grad-${s.key})`}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarTrendChart({
  data,
  xKey,
  series,
  height = 280,
  format = 'currency',
}: {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  format?: 'currency' | 'number';
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={24} />
          <YAxis tick={(p: any) => axisTick(p, format)} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={42} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComposedTrendChart({
  data,
  xKey,
  series,
  height = 300,
}: {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={24} />
          <YAxis tick={(p: any) => axisTick(p, 'currency')} tickLine={false} axisLine={false} width={56} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#64748b' }} />
          {series.map((s) =>
            s.kind === 'line' ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  nameKey,
  valueKey,
  height = 260,
  format = 'number',
  centerLabel,
}: {
  data: any[];
  nameKey: string;
  valueKey: string;
  height?: number;
  format?: 'number' | 'currency';
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + Number(d[valueKey] || 0), 0);
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{centerLabel}</span>
          <span className="text-xl font-extrabold text-slate-900 tabular-nums">
            {format === 'currency' ? `\u09F3${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(total)}` : new Intl.NumberFormat('en-US').format(total)}
          </span>
        </div>
      )}
    </div>
  );
}

export { ChartLegend } from './ChartLegend';
