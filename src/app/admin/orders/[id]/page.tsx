import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { OrderDetailView } from '@/components/admin/orders/OrderDetailView';
import { extractProductImages } from '@/lib/store/extract-images';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*, products(name, sku, product_images(url,sort_order)), product_variants(size, color)')
    .eq('order_id', id);

  const { data: timeline } = await supabase
    .from('order_timeline')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  // Attach extracted images to each item for easy access
  const enrichedItems = (items ?? []).map((item: any) => ({
    ...item,
    images: extractProductImages(item.products?.product_images),
  }));

  return (
    <OrderDetailView
      order={order}
      items={enrichedItems}
      timeline={timeline ?? []}
    />
  );
}

