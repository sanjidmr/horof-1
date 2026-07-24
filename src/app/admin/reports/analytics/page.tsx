import { getWebsiteAnalytics } from '@/lib/actions/reports';
import { WebsiteAnalyticsClient } from './WebsiteAnalyticsClient';

export default async function WebsiteAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getWebsiteAnalytics(range);

  return <WebsiteAnalyticsClient data={data} currentRange={range || ''} />;
}
