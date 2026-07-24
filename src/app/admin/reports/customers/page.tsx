import { getCustomerReport } from '@/lib/actions/reports';
import { CustomerReportClient } from './CustomerReportClient';

export default async function CustomerReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getCustomerReport(range);

  return <CustomerReportClient data={data} currentRange={range || ''} />;
}
