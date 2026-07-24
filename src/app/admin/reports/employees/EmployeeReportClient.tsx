'use client';

import { useRouter } from 'next/navigation';
import { Users, Shield, LogIn, LogOut, Headset, MessageSquare, Clock, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';

export function EmployeeReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/employees?range=${encodeURIComponent(range)}`);
  };

  const login = data.loginSummary || {};
  const support = data.supportMetrics || {};

  const loginChartData = [
    { name: 'Successful', value: login.successful_logins || 0 },
    { name: 'Failed', value: login.failed_logins || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.adminActivity} filename="admin-activity-report" columns={[
          { key: 'user_email', label: 'Admin Email' }, { key: 'action_count', label: 'Actions' },
          { key: 'last_active', label: 'Last Active' }, { key: 'top_action', label: 'Top Action' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Admin Actions" value={String(data.adminActivity.reduce((s: number, a: any) => s + (a.action_count || 0), 0))} icon={Shield} color="bg-blue-50 text-blue-600" />
        <KPICard label="Total Logins" value={String(login.total_attempts || 0)} icon={LogIn} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Failed Logins" value={String(login.failed_logins || 0)} icon={LogOut} color="bg-red-50 text-red-600" />
        <KPICard label="Total Tickets" value={String(support.total_tickets || 0)} icon={Headset} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Resolved Tickets" value={String(support.resolved_tickets || 0)} icon={Headset} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Avg Resolution Hours" value={`${Number(support.avg_resolution_hours || 0).toFixed(1)}h`} icon={Clock} color="bg-amber-50 text-amber-600" />
        <KPICard label="Avg CSAT" value={`${Number(support.avg_csat || 0).toFixed(1)}%`} icon={Star} color="bg-orange-50 text-orange-600" />
        <KPICard label="Chat Conversations" value={String(support.total_chat_conversations || 0)} icon={MessageSquare} color="bg-cyan-50 text-cyan-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Login Summary" subtitle="Successful vs failed login attempts">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loginChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1a4731" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Unique Users" subtitle={`${login.unique_users || 0} unique users in this period`}>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl font-black text-slate-900">{login.unique_users || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Unique Users</p>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Admin Activity" subtitle="Actions performed by admin users">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Admin Email</th>
              <th className="py-2.5 px-3 font-bold text-right">Action Count</th>
              <th className="py-2.5 px-3 font-bold">Last Active</th>
              <th className="py-2.5 px-3 font-bold">Top Action</th>
            </tr></thead>
            <tbody>
              {data.adminActivity.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-slate-400">No admin activity data available</td></tr>
              )}
              {data.adminActivity.map((row: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{row.user_email || '-'}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-blue-600">{row.action_count || 0}</td>
                  <td className="py-2.5 px-3 text-slate-500">{row.last_active ? new Date(row.last_active).toLocaleDateString() : '-'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{row.top_action || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Support Agent Performance" subtitle="Individual agent metrics">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Agent Name</th>
              <th className="py-2.5 px-3 font-bold text-right">Tickets Handled</th>
              <th className="py-2.5 px-3 font-bold text-right">Avg Response Hours</th>
              <th className="py-2.5 px-3 font-bold text-right">Avg CSAT</th>
            </tr></thead>
            <tbody>
              {data.agentPerformance.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-slate-400">No agent performance data available</td></tr>
              )}
              {data.agentPerformance.map((row: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{row.agent_name || '-'}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.tickets_handled || 0}</td>
                  <td className="py-2.5 px-3 text-right">{Number(row.avg_response_hours || 0).toFixed(1)}h</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{Number(row.avg_csat || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Login History Summary" subtitle="Login statistics breakdown">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Metric</th>
              <th className="py-2.5 px-3 font-bold text-right">Value</th>
            </tr></thead>
            <tbody>
              {[
                { label: 'Total Attempts', value: login.total_attempts || 0 },
                { label: 'Successful Logins', value: login.successful_logins || 0 },
                { label: 'Failed Logins', value: login.failed_logins || 0 },
                { label: 'Unique Users', value: login.unique_users || 0 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{row.label}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-700">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
