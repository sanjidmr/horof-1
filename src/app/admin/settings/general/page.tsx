import { getAppSettings } from '@/lib/actions/app-settings';
import { GeneralSettingsClient } from './GeneralSettingsClient';

export const metadata = { title: 'General Settings | Admin' };

export default async function AdminSettingsGeneralPage() {
  const settings = await getAppSettings();
  return <GeneralSettingsClient initial={settings.general} />;
}
