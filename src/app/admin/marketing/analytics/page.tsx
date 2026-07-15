import { getSiteSetting } from '@/lib/actions/site-settings';
import { AnalyticsSettingsForm } from './AnalyticsSettingsForm';

export default async function AdminAnalyticsPage() {
  const measurementId = (await getSiteSetting('google_analytics')) as string | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Google Analytics (GA4)</h1>
        <p className="text-sm text-slate-500">
          Configure Google Analytics 4 measurement. The tracking code will be injected site-wide when enabled.
        </p>
      </div>
      <AnalyticsSettingsForm initialValue={measurementId || ''} />
    </div>
  );
}
