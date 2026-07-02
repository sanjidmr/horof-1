import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductForm, type BrandOption, type CategoryOption } from '@/components/admin/products/ProductForm';

export default async function AddProductPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('id, name, parent_id').eq('is_active', true).order('order', { ascending: true }),
    supabase.from('brands').select('id, name').eq('is_active', true).order('name', { ascending: true }),
  ]);

  return (
    <ProductForm
      mode="create"
      categories={(categories ?? []) as CategoryOption[]}
      brands={(brands ?? []) as BrandOption[]}
    />
  );
}
