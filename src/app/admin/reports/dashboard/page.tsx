import { getDashboardKpis } from '@/lib/actions/reports';
import { AnalyticsDashboardClient } from './AnalyticsDashboardClient';

export default async function ReportsDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getDashboardKpis(range);

  return (
    <div className="space-y-6">
      <AnalyticsDashboardClient data={data} currentRange={range || ''} />
    </div>
  );
}
