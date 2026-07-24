import { getShippingReport } from '@/lib/actions/reports';
import { ShippingReportClient } from './ShippingReportClient';

export default async function ShippingReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getShippingReport(range);

  return <ShippingReportClient data={data} currentRange={range || ''} />;
}
