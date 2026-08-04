import { getAppSettings } from '@/lib/actions/app-settings';
import { SocialSettingsClient } from './SocialSettingsClient';

export const metadata = { title: 'Social Settings | Admin' };

export default async function AdminSettingsSocialPage() {
  const settings = await getAppSettings();
  return <SocialSettingsClient initial={settings.social} />;
}
