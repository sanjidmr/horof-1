'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createNotification, checkLowStock } from './notifications';

export async function placeOrder(orderData: {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_charge: number;
  delivery_type: string;
  total: number;
  items: { 
    product_id: string; 
    quantity: number; 
    unit_price: number; 
    name: string;
    selectedSpecs?: Record<string, string>;
    designCharge?: number;
    customerNotes?: string;
    originalPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
    finalTotal?: number;
  }[];
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Unauthorized. Please login first to place an order.' };
  }

  // 1. Create the order request
  const summaryName = orderData.items.length === 1 
    ? orderData.items[0].name 
    : `${orderData.items[0].name} & ${orderData.items.length - 1} other${orderData.items.length > 2 ? 's' : ''}`;

  const totalQty = orderData.items.reduce((sum, item) => sum + item.quantity, 0);

  const { data: orderRequest, error: requestErr } = await supabase
    .from('order_requests')
    .insert({
      product_id: orderData.items.length === 1 ? orderData.items[0].product_id : null,
      product_name: summaryName,
      user_id: user.id,
      customer_info: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderData.customer_address,
        items: orderData.items,
        delivery_charge: orderData.delivery_charge,
        delivery_type: orderData.delivery_type,
      },
      selected_specifications: {},
      quantity: totalQty,
      discount_percent: 0,
      discount_amount: 0,
      design_charge: 0,
      customer_notes: null,
      final_total_price: orderData.total,
      status: 'pending'
    })
    .select('id')
    .single();

  if (requestErr || !orderRequest) {
    return { ok: false, message: requestErr?.message || 'Failed to submit order request' };
  }

  // Clear database cart items
  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id);
  } catch (clearCartErr) {
    console.error('Failed to clear database cart items:', clearCartErr);
  }

  // 2. Create Notification for Order Request
  await createNotification(
    'New Order Request',
    `A new order request (#${String(orderRequest.id).slice(0, 8)}) for ৳${orderData.total.toLocaleString()} has been placed by ${orderData.customer_name}.`,
    'order'
  );

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/order-requests');

  return { ok: true, orderId: orderRequest.id };
}
