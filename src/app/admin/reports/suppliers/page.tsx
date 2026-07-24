import { getSupplierReport } from '@/lib/actions/reports';
import { SupplierReportClient } from './SupplierReportClient';

export default async function SupplierReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getSupplierReport(range);

  return <SupplierReportClient data={data} currentRange={range || ''} />;
}
