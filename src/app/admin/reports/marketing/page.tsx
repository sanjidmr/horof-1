import { getMarketingReport } from '@/lib/actions/reports';
import { MarketingReportClient } from './MarketingReportClient';

export default async function MarketingReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getMarketingReport(range);

  return <MarketingReportClient data={data} currentRange={range || ''} />;
}
