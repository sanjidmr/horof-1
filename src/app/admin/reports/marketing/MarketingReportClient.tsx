'use client';

import { useRouter } from 'next/navigation';
import { Tag, Mail, Users, MousePointerClick, TrendingUp, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

export function MarketingReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/marketing?range=${encodeURIComponent(range)}`);
  };

  const totalCouponsUsed = data.coupons.reduce((s: number, c: any) => s + c.uses, 0);
  const totalCouponDiscount = data.coupons.reduce((s: number, c: any) => s + Number(c.total_discount || 0), 0);
  const totalEmailSent = data.emailCampaigns.reduce((s: number, c: any) => s + c.recipients, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.coupons} filename="marketing-coupons" columns={[
          { key: 'code', label: 'Code' }, { key: 'type', label: 'Type' }, { key: 'uses', label: 'Uses' },
          { key: 'total_discount', label: 'Total Discount' }, { key: 'revenue', label: 'Revenue' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Total Coupons Used" value={String(totalCouponsUsed)} icon={Tag} color="bg-blue-50 text-blue-600" />
        <KPICard label="Total Coupon Discount" value={formatPrice(totalCouponDiscount)} icon={Percent} color="bg-purple-50 text-purple-600" />
        <KPICard label="Email Campaigns Sent" value={String(totalEmailSent)} icon={Mail} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Subscriber Count" value={String(data.subscribers[data.subscribers.length - 1]?.net_subscribers || 0)} icon={Users} color="bg-amber-50 text-amber-600" />
        <KPICard label="Active Popups" value={String(data.popups.filter((p: any) => p.is_active).length)} icon={MousePointerClick} color="bg-rose-50 text-rose-600" />
      </div>

      <ChartCard title="Coupon Performance" subtitle={`${data.coupons.length} coupons tracked`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Code</th>
              <th className="py-2.5 px-3 font-bold">Type</th>
              <th className="py-2.5 px-3 font-bold text-right">Uses</th>
              <th className="py-2.5 px-3 font-bold text-right">Total Discount</th>
              <th className="py-2.5 px-3 font-bold text-right">Revenue</th>
            </tr></thead>
            <tbody>
              {data.coupons.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No coupon data available</td></tr>
              )}
              {data.coupons.map((c: any, i: number) => (
                <tr key={c.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{c.code}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">{c.type}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">{c.uses}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-amber-600">{formatPrice(c.total_discount)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Subscriber Growth" subtitle="New subscribers vs unsubscribes">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.subscribers}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="new_subscribers" fill="#1a4731" radius={[4, 4, 0, 0]} name="New" />
                <Bar dataKey="unsubscribes" fill="#dc2626" radius={[4, 4, 0, 0]} name="Unsubscribed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Popup Campaign Performance" subtitle="Views and conversions">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">Name</th>
                <th className="py-2.5 px-3 font-bold">Type</th>
                <th className="py-2.5 px-3 font-bold text-right">Views</th>
                <th className="py-2.5 px-3 font-bold text-right">Conversions</th>
                <th className="py-2.5 px-3 font-bold text-right">Conv. Rate</th>
              </tr></thead>
              <tbody>
                {data.popups.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">No popup data available</td></tr>
                )}
                {data.popups.map((p: any, i: number) => (
                  <tr key={p.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">{p.type}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">{p.views}</td>
                    <td className="py-2.5 px-3 text-right">{p.conversions}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{p.conversion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Email Campaign Performance" subtitle={`${data.emailCampaigns.length} campaigns tracked`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Campaign</th>
              <th className="py-2.5 px-3 font-bold">Subject</th>
              <th className="py-2.5 px-3 font-bold">Status</th>
              <th className="py-2.5 px-3 font-bold text-right">Recipients</th>
              <th className="py-2.5 px-3 font-bold text-right">Delivered</th>
              <th className="py-2.5 px-3 font-bold text-right">Opens</th>
              <th className="py-2.5 px-3 font-bold text-right">Clicks</th>
              <th className="py-2.5 px-3 font-bold text-right">Open Rate</th>
              <th className="py-2.5 px-3 font-bold text-right">Click Rate</th>
            </tr></thead>
            <tbody>
              {data.emailCampaigns.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">No email campaign data available</td></tr>
              )}
              {data.emailCampaigns.map((c: any, i: number) => (
                <tr key={c.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{c.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">{c.subject}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                      c.status === 'sent' ? 'bg-emerald-50 text-emerald-600' :
                      c.status === 'draft' ? 'bg-slate-100 text-slate-500' :
                      c.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>{c.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">{c.recipients}</td>
                  <td className="py-2.5 px-3 text-right">{c.delivered}</td>
                  <td className="py-2.5 px-3 text-right">{c.opens}</td>
                  <td className="py-2.5 px-3 text-right">{c.clicks}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{c.open_rate}%</td>
                  <td className="py-2.5 px-3 text-right font-medium text-blue-600">{c.click_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Bundle Offers" subtitle={`${data.bundles.length} bundles configured`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Name</th>
              <th className="py-2.5 px-3 font-bold">Type</th>
              <th className="py-2.5 px-3 font-bold text-right">Used Count</th>
              <th className="py-2.5 px-3 font-bold text-right">Max Uses</th>
              <th className="py-2.5 px-3 font-bold text-right">Status</th>
            </tr></thead>
            <tbody>
              {data.bundles.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No bundle data available</td></tr>
              )}
              {data.bundles.map((b: any, i: number) => (
                <tr key={b.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{b.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">{b.type}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">{b.used_count}</td>
                  <td className="py-2.5 px-3 text-right">{b.max_uses || 'Unlimited'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                      b.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
