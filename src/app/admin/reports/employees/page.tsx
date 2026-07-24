import { getAdminReport } from '@/lib/actions/reports';
import { EmployeeReportClient } from './EmployeeReportClient';

export default async function EmployeeReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getAdminReport(range);

  return <EmployeeReportClient data={data} currentRange={range || ''} />;
}
