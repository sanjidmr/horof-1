import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminSettingsSeoPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">Key <code className="font-mono text-xs">seo</code> in site_settings.</CardContent>
    </Card>
  );
}
