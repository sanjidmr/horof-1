import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductForm, type CategoryOption, type SubcategoryOption } from '@/components/admin/products/ProductForm';

export default async function AddProductPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const [{ data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from('categories').select('id, name, parent_id').eq('is_active', true).order('order', { ascending: true }),
    supabase.from('subcategories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);

  return (
    <ProductForm
      mode="create"
      categories={(categories ?? []) as CategoryOption[]}
      subcategories={(subcategories ?? []) as SubcategoryOption[]}
    />
  );
}
