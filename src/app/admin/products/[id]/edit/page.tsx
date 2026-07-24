import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { objectToDetails } from '@/lib/validation/product-form';
import { ProductForm, type CategoryOption, type SubcategoryOption, type ProductFormInitial } from '@/components/admin/products/ProductForm';

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: product, error: productError } = await supabase.from('products').select('*').eq('id', id).maybeSingle();

  if (productError || !product) notFound();

  const [
  { data: images },
  { data: variants },
  { data: categories },
  { data: subcategories }
] = await Promise.all([
  supabase
    .from('product_images')
    .select('url')
    .eq('product_id', id)
    .order('display_order', { ascending: true }),

  supabase
    .from('product_variants')
    .select('size, color, stock, price_modifier')
    .eq('product_id', id)
    .order('created_at', { ascending: true }),

  supabase
    .from('categories')
    .select('id, name, parent_id')
    .eq('is_active', true)
    .order('display_order', { ascending: true }),

  supabase
    .from('subcategories')
    .select('*')
    .order('sort_order', { ascending: true }),
]);
  const oc = (product as any).order_config ?? {};

  const initial: ProductFormInitial = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: (product as any).sku ?? '',
    price: Number(product.price),
    offer_price: product.compare_price != null ? Number(product.compare_price) : null,
    stock: product.stock,
    description: product.description,
    specification: product.specification,
    product_details: (product as any).product_details ? objectToDetails((product as any).product_details) : null,
    perfect_for: typeof product.perfect_for === 'string' ? product.perfect_for.split(',').map((s: string) => s.trim()) : null,
    section: (product as any).section ?? (product.is_product_of_the_day ? 'product_of_the_day' : product.is_new_arrival ? 'new_arrival' : 'best_selling'),
    flash_sale_ends_at: (product as any).flash_sale_ends_at ?? null,
    meta_title: (product as any).meta_title ?? '',
    meta_description: (product as any).meta_description ?? '',
    category_id: product.category_id,
    subcategory_id: (product as any).subcategory_id ?? null,
    brand_id: (product as any).brand_id ?? null,
    images: (images ?? []).map((img) => ({ url: (img as any).image_url ?? '' })),
    variants: (variants ?? []).map((v) => ({
      size: v.size,
      color: v.color,
      stock: Number(v.stock),
      price_modifier: Number(v.price_modifier),
    })),
    order_config: {
      quantity_discounts: oc.quantity_discounts ?? [],
      specification_steps: oc.specification_steps ?? [],
      design_charge: {
        enabled: oc.design_charge?.enabled ?? false,
        amount: Number(oc.design_charge?.amount ?? 0),
        description: oc.design_charge?.description ?? '',
      },
      customer_notes_settings: {
        enabled: oc.customer_notes_settings?.enabled ?? false,
        title: oc.customer_notes_settings?.title ?? 'Specification Need Details',
        placeholder: oc.customer_notes_settings?.placeholder ?? '',
      },
      pricing_config: {
        min_order_qty: oc.pricing_config?.min_order_qty ?? 1,
        max_order_qty: oc.pricing_config?.max_order_qty ?? null,
      },
      order_request_settings: oc.order_request_settings ?? {
        enable_order_requests: true,
        enable_add_to_cart: true,
        enable_direct_order: false,
        auto_approval: false,
      },
      display_controls: oc.display_controls ?? {
        show_discount_table: true,
        show_specifications: true,
        show_customer_notes: true,
        show_quantity_selector: true,
        show_design_charge: true,
        show_total_price: true,
        show_send_request: true,
        show_add_to_cart: true,
      },
    },
  };

  return (
    <ProductForm
      mode="edit"
      categories={(categories ?? []) as CategoryOption[]}
      subcategories={(subcategories ?? []) as SubcategoryOption[]}
      initial={initial}
    />
  );
}
