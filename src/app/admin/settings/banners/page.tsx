import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminSettingsBannersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banners</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">Hero uses the <code className="font-mono text-xs">banners</code> table (see migration).</CardContent>
    </Card>
  );
}
