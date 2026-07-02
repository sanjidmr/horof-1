import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CategoryManager } from '@/components/admin/products/CategoryManager';

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('categories').select('*').order('order');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categories</h1>
        <p className="text-sm text-slate-500">Manage your product categories and hierarchy.</p>
      </div>
      
      <CategoryManager initialCategories={data || []} />
    </div>
  );
}

