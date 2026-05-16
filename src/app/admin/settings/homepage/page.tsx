import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminSettingsHomepagePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">JSON in <code className="font-mono text-xs">site_settings.homepage</code> toggles sections (see HomePageClient).</CardContent>
    </Card>
  );
}
