import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default async function AdminRefundsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('refunds').select('*').order('requested_at', { ascending: false }).limit(200);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refunds</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        {(data ?? []).length === 0 ? 'No refund rows yet.' : JSON.stringify(data, null, 2)}
      </CardContent>
    </Card>
  );
}
