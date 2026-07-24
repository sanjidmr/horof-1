import { getOrderReport } from '@/lib/actions/reports';
import { OrdersReportClient } from './OrdersReportClient';

export default async function OrdersReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getOrderReport(range);

  return <OrdersReportClient data={data} currentRange={range || ''} />;
}
