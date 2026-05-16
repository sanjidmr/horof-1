import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminSettingsGeneralPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">Use key <code className="font-mono text-xs">general</code> in site_settings.</CardContent>
    </Card>
  );
}
