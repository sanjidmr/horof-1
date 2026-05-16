import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminMetaPixelPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta Pixel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <p>Store <code className="font-mono text-xs">meta_pixel</code> in <code className="font-mono text-xs">site_settings</code>. Inject in root layout when enabled.</p>
      </CardContent>
    </Card>
  );
}
