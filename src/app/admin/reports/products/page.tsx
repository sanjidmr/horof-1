import { getProductReport } from '@/lib/actions/reports';
import { ProductReportClient } from './ProductReportClient';

export default async function ProductReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getProductReport(range);

  return <ProductReportClient data={data} currentRange={range || ''} />;
}
