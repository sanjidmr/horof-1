import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export default async function AdminCouriersPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('couriers').select('*').order('name');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Couriers</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <ul className="divide-y rounded-md border">
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex justify-between px-3 py-2">
              <span>{c.name}</span>
              <span className="text-xs text-slate-500">{c.is_active ? 'Active' : 'Off'}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
