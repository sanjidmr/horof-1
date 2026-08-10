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

  // Fetch warehouse details if assigned
  let warehouse = null;
  if (order.warehouse_id) {
    const { data: wh } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', order.warehouse_id)
      .single();
    warehouse = wh;
  }

  // Fetch warehouse assignment details
  const { data: warehouseAssignment } = await supabase
    .from('warehouse_assignments')
    .select('*')
    .eq('entity_id', id)
    .eq('entity_type', 'order')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch warehouse staff profile if assigned
  let warehouseStaff = null;
  if (order.warehouse_staff_id) {
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', order.warehouse_staff_id)
      .single();
    warehouseStaff = staff;
  }

  // Fetch payment details
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch shipment details
  const { data: shipment } = await supabase
    .from('shipments')
    .select('*, couriers(name)')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch customer profile if user_id exists
  let customerProfile = null;
  if (order.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', order.user_id)
      .single();
    customerProfile = profile;
  }

  // Fetch assigned staff (admin who approved)
  let assignedStaff = null;
  if (order.approved_by) {
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', order.approved_by)
      .single();
    assignedStaff = staff;
  }

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