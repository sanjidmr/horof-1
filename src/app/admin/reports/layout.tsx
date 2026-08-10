import { ReportNavigation } from './ReportNavigation';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Comprehensive business intelligence and reporting</p>
        </div>
      </div>
      <ReportNavigation />
      {children}
    </div>
  );
}
