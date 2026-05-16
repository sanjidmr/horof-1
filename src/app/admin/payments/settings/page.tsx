import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

export default function AdminPaymentSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment gateways</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stripe">
          <TabsList>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="paypal">PayPal</TabsTrigger>
            <TabsTrigger value="ssl">SSLCommerz</TabsTrigger>
            <TabsTrigger value="bkash">bKash</TabsTrigger>
            <TabsTrigger value="nagad">Nagad</TabsTrigger>
          </TabsList>
          <TabsContent value="stripe" className="pt-4 text-sm text-slate-600">
            Persist configuration in <code className="font-mono text-xs">site_settings</code> key <code className="font-mono">payment_gateways</code>.
          </TabsContent>
          <TabsContent value="paypal" className="pt-4 text-sm text-slate-600">
            Same JSON payload; restrict read/write to admins via RLS (already enforced).
          </TabsContent>
          <TabsContent value="ssl" className="pt-4 text-sm text-slate-600" />
          <TabsContent value="bkash" className="pt-4 text-sm text-slate-600" />
          <TabsContent value="nagad" className="pt-4 text-sm text-slate-600" />
        </Tabs>
      </CardContent>
    </Card>
  );
}
