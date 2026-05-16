import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminAnalyticsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Analytics</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        Store measurement ID under <code className="font-mono text-xs">site_settings.google_analytics</code>.
      </CardContent>
    </Card>
  );
}
