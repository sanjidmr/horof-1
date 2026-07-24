'use client';

import { useRouter } from 'next/navigation';
import { Globe, Eye, Clock, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#d8f3dc'];

export function WebsiteAnalyticsClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/analytics?range=${encodeURIComponent(range)}`);
  };

  const totalUniqueVisitors = data.visitors.reduce((s: number, v: any) => s + (v.unique_visitors || 0), 0);
  const totalPageViews = data.visitors.reduce((s: number, v: any) => s + (v.page_views || 0), 0);
  const avgDuration = data.visitors.length > 0
    ? Math.round(data.visitors.reduce((s: number, v: any) => s + (v.avg_duration || 0), 0) / data.visitors.length)
    : 0;
  const avgBounceRate = data.visitors.length > 0
    ? Math.round(data.visitors.reduce((s: number, v: any) => s + (v.bounce_rate || 0), 0) / data.visitors.length * 100) / 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.visitors} filename="website-analytics" columns={[
          { key: 'date', label: 'Date' }, { key: 'unique_visitors', label: 'Unique Visitors' },
          { key: 'page_views', label: 'Page Views' }, { key: 'avg_duration', label: 'Avg Duration' },
          { key: 'bounce_rate', label: 'Bounce Rate' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Unique Visitors" value={String(totalUniqueVisitors)} icon={Globe} color="bg-blue-50 text-blue-600" />
        <KPICard label="Page Views" value={String(totalPageViews)} icon={Eye} color="bg-purple-50 text-purple-600" />
        <KPICard label="Avg Duration" value={`${avgDuration}s`} icon={Clock} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Bounce Rate" value={`${avgBounceRate}%`} icon={ArrowUpRight} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Visitors" subtitle="Unique visitors and page views">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.visitors}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="unique_visitors" fill="#1a4731" radius={[4, 4, 0, 0]} name="Unique Visitors" />
                <Bar dataKey="page_views" fill="#52b788" radius={[4, 4, 0, 0]} name="Page Views" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Bounce Rate Trend" subtitle="Daily bounce rate percentage">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.visitors}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="bounce_rate" stroke="#1a4731" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Traffic Sources" subtitle="Where visitors come from">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.trafficSources} dataKey="visitor_count" nameKey="source" cx="50%" cy="50%" outerRadius={70} label={({ source, visitor_count }: any) => `${source}: ${visitor_count}`}>
                  {data.trafficSources.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Device Analytics" subtitle="Visitors by device type">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.devices} dataKey="visitor_count" nameKey="device_type" cx="50%" cy="50%" outerRadius={70} label={({ device_type, visitor_count }: any) => `${device_type}: ${visitor_count}`}>
                  {data.devices.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Top Pages" subtitle="Most visited pages">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">#</th>
              <th className="py-2.5 px-3 font-bold">Page</th>
              <th className="py-2.5 px-3 font-bold text-right">Views</th>
              <th className="py-2.5 px-3 font-bold text-right">Unique Visitors</th>
              <th className="py-2.5 px-3 font-bold text-right">Avg Duration</th>
            </tr></thead>
            <tbody>
              {data.topPages.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No page data available</td></tr>
              )}
              {data.topPages.map((p: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[300px] truncate">{p.page_path}</td>
                  <td className="py-2.5 px-3 text-right">{p.views}</td>
                  <td className="py-2.5 px-3 text-right">{p.unique_visitors}</td>
                  <td className="py-2.5 px-3 text-right">{p.avg_duration}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Browser Analytics" subtitle="Visitors by browser">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">#</th>
                <th className="py-2.5 px-3 font-bold">Browser</th>
                <th className="py-2.5 px-3 font-bold text-right">Visitors</th>
                <th className="py-2.5 px-3 font-bold text-right">Percentage</th>
              </tr></thead>
              <tbody>
                {data.browsers.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-400">No browser data available</td></tr>
                )}
                {data.browsers.map((b: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{b.browser}</td>
                    <td className="py-2.5 px-3 text-right">{b.visitor_count}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{b.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Geographic Analytics" subtitle="Visitors by location">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">#</th>
                <th className="py-2.5 px-3 font-bold">Country</th>
                <th className="py-2.5 px-3 font-bold">City</th>
                <th className="py-2.5 px-3 font-bold text-right">Visitors</th>
                <th className="py-2.5 px-3 font-bold text-right">Page Views</th>
              </tr></thead>
              <tbody>
                {data.geo.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">No geographic data available</td></tr>
                )}
                {data.geo.map((g: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{g.country}</td>
                    <td className="py-2.5 px-3 text-slate-500">{g.city || '-'}</td>
                    <td className="py-2.5 px-3 text-right">{g.visitor_count}</td>
                    <td className="py-2.5 px-3 text-right">{g.page_views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
