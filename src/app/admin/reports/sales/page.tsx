import { getSalesReport } from '@/lib/actions/reports';
import { SalesReportClient } from './SalesReportClient';

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getSalesReport('daily', range);

  return <SalesReportClient data={data} currentRange={range || ''} />;
}
