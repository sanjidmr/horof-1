import { getProfitLossReport } from '@/lib/actions/reports';
import { ProfitLossClient } from './ProfitLossClient';

export default async function ProfitLossPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getProfitLossReport(range);

  return <ProfitLossClient data={data} currentRange={range || ''} />;
}
