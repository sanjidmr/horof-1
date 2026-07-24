import { getInventoryReport } from '@/lib/actions/reports';
import { InventoryReportClient } from './InventoryReportClient';

export default async function InventoryReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getInventoryReport();

  return <InventoryReportClient data={data} currentRange={range || ''} />;
}
