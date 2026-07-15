import { getSiteSetting } from '@/lib/actions/site-settings';
import { PixelSettingsForm } from './PixelSettingsForm';

export default async function AdminMetaPixelPage() {
  const pixelId = (await getSiteSetting('meta_pixel')) as string | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meta Pixel</h1>
        <p className="text-sm text-slate-500">
          Configure Facebook Pixel tracking. The pixel code will be injected site-wide when enabled.
        </p>
      </div>
      <PixelSettingsForm initialValue={pixelId || ''} />
    </div>
  );
}
