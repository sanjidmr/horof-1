import { getFinanceReport } from '@/lib/actions/reports';
import { FinanceReportClient } from './FinanceReportClient';

export default async function FinanceReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getFinanceReport(range);

  return <FinanceReportClient data={data} currentRange={range || ''} />;
}
