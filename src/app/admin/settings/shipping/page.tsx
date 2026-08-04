import { getAppSettings } from '@/lib/actions/app-settings';
import { ShippingSettingsClient } from './ShippingSettingsClient';

export const metadata = { title: 'Shipping Settings | Admin' };

export default async function AdminSettingsShippingPage() {
  const settings = await getAppSettings();
  return <ShippingSettingsClient initial={settings.shipping} />;
}
