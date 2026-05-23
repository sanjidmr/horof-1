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
  items: { product_id: string; quantity: number; unit_price: number; name: string }[];
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Unauthorized. Please login first to place an order.' };
  }

  // 1. Create the order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      total: orderData.total,
      status: 'confirmed',
      payment_method: 'cod',
      payment_status: 'pending',
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      customer_phone: orderData.customer_phone,
      customer_address: orderData.customer_address,
      delivery_charge: orderData.delivery_charge,
      delivery_type: orderData.delivery_type,
      user_id: user.id,
      customer_id: user.id,
    })
    .select('id')
    .single();

  if (orderErr || !order) {
    return { ok: false, message: orderErr?.message || 'Failed to create order' };
  }

  // 2. Create order items
  const orderItems = orderData.items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    user_id: user.id,
  }));

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
  if (itemsErr) {
    return { ok: false, message: itemsErr.message };
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

  // 3. Update stock
  for (const item of orderData.items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single();

    if (product) {
      await supabase
        .from('products')
        .update({ stock: Math.max(0, product.stock - item.quantity) })
        .eq('id', item.product_id);
    }
  }

  // 4. Create Notification
  await createNotification(
    'New Order Placed',
    `A new order (#${String(order.id).slice(0, 8)}) for ৳${orderData.total.toLocaleString()} has been placed by ${orderData.customer_name}.`,
    'order'
  );

  // 5. Check for low stock
  await checkLowStock();

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/orders');

  return { ok: true, orderId: order.id };
}
