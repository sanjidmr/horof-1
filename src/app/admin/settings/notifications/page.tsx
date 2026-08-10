import { getAppSettings } from '@/lib/actions/app-settings';
import { NotificationSettingsClient } from './NotificationSettingsClient';

export const metadata = { title: 'Notification Settings | Admin' };

export default async function AdminSettingsNotificationsPage() {
  const settings = await getAppSettings();
  return <NotificationSettingsClient initial={settings.notifications} />;
}
