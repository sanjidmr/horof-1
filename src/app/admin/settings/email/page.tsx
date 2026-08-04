import { getAppSettings } from '@/lib/actions/app-settings';
import { EmailSettingsClient } from './EmailSettingsClient';

export const metadata = { title: 'Email Settings | Admin' };

export default async function AdminSettingsEmailPage() {
  const settings = await getAppSettings();
  return <EmailSettingsClient initial={settings.email} />;
}
