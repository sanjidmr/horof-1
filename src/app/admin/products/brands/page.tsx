import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BrandManager } from '@/components/admin/products/BrandManager';

export default async function AdminBrandsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('brands').select('*').order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Brands</h1>
        <p className="text-sm text-slate-500">Manage your product brands and manufacturers.</p>
      </div>
      
      <BrandManager initialBrands={data || []} />
    </div>
  );
}

