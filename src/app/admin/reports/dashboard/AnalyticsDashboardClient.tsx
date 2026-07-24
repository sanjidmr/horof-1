'use client';

import { useState } from 'react';
import { DollarSign, ShoppingBag, Users, Package, TrendingUp, ShoppingCart, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, ComposedChart } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#d8f3dc'];
const PIE_COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#9333ea', '#ea580c'];

export function AnalyticsDashboardClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const kpiData = [
    { label: 'Total Revenue', value: formatPrice(data.totalRevenue), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Paid Revenue', value: formatPrice(data.paidRevenue), icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Orders', value: String(data.totalOrders), subtitle: `${data.todayOrders} today, ${data.weekOrders} this week`, icon: ShoppingBag, color: 'bg-purple-50 text-purple-600' },
    { label: 'Pending Orders', value: String(data.pendingOrders), icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
    { label: 'Customers', value: String(data.totalCustomers), icon: Users, color: 'bg-orange-50 text-orange-600' },
    { label: 'Products', value: String(data.totalProducts), icon: Package, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Avg Order Value', value: formatPrice(data.aov), icon: BarChart3, color: 'bg-rose-50 text-rose-600' },
    { label: 'Conversion Rate', value: `${data.conversionRate}%`, subtitle: 'Orders / Visitors', icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
  ];

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/dashboard?range=${encodeURIComponent(range)}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={kpiData} filename="dashboard-kpis" columns={[{ key: 'label', label: 'Metric' }, { key: 'value', label: 'Value' }]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Revenue Trend" subtitle="Daily revenue over selected period" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#1a4731" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Orders Overview" subtitle={`${data.totalOrders} total orders`}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {data.salesByCategory?.length > 0 && (
        <ChartCard title="Sales by Category" subtitle="Revenue breakdown by product category">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesByCategory}>
                <XAxis dataKey="category_name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="revenue" fill="#1a4731" radius={[4, 4, 0, 0]}>
                  {data.salesByCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Sales" subtitle="Daily revenue and item count">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v: number, n: string) => n === 'revenue' ? formatPrice(v) : v} />
                <Bar yAxisId="left" dataKey="revenue" fill="#1a4731" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="items_sold" stroke="#ca8a04" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Average Order Value" subtitle="Trend over time">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatPrice(v)} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Line type="monotone" dataKey="avg_order_value" stroke="#9333ea" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </>
  );
}
