import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function AdminPaymentSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">&#10003;</div>
          <div>
            <p className="font-bold text-emerald-900">Cash on Delivery (COD)</p>
            <p className="text-emerald-700 text-xs">All orders use Cash on Delivery. No online payment gateways are configured or available.</p>
          </div>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          This store operates exclusively on Cash on Delivery. Orders are created with a pending payment status,
          and the admin can mark them as paid, refunded, or cancelled directly from the order detail page.
        </p>
      </CardContent>
    </Card>
  );
}
