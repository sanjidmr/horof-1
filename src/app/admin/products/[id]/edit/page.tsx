import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductForm, type BrandOption, type CategoryOption, type ProductFormInitial } from '@/components/admin/products/ProductForm';

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: product, error: productError } = await supabase.from('products').select('*').eq('id', id).maybeSingle();

  if (productError || !product) notFound();

  const [{ data: images }, { data: variants }, { data: categories }, { data: brands }] = await Promise.all([
    supabase.from('product_images').select('image_url').eq('product_id', id).order('sort_order', { ascending: true }),
    supabase.from('product_variants').select('size, color, stock, price_modifier').eq('product_id', id).order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name, parent_id').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('brands').select('id, name').eq('is_active', true).order('name', { ascending: true }),
  ]);

  const initial: ProductFormInitial = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: Number(product.price),
    offer_price: product.offer_price != null ? Number(product.offer_price) : null,
    stock: product.stock,
    description: product.description,
    specification: product.specification,
    perfect_for: product.perfect_for,
    section: product.section,
    flash_sale_ends_at: product.flash_sale_ends_at,
    meta_title: product.meta_title,
    meta_description: product.meta_description,
    category_id: product.category_id,
    brand_id: product.brand_id,
    images: images ?? [],
    variants: (variants ?? []).map((v) => ({
      size: v.size,
      color: v.color,
      stock: Number(v.stock),
      price_modifier: Number(v.price_modifier),
    })),
  };

  return (
    <ProductForm
      mode="edit"
      categories={(categories ?? []) as CategoryOption[]}
      brands={(brands ?? []) as BrandOption[]}
      initial={initial}
    />
  );
}
