import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminSettingsThemePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">Key <code className="font-mono text-xs">theme</code> in site_settings; preview in admin shell.</CardContent>
    </Card>
  );
}
