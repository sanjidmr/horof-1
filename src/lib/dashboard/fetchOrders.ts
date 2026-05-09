import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbOrderItemRow, DbOrderRow, DbProductRow, OrderWithItems } from './types';
import { orderRowTotal } from './orderHelpers';

/**
 * Loads orders + order_items, then attaches product rows via a single `products.in('id', …)` batch.
 */
export async function fetchOrdersWithItemsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<OrderWithItems[]> {
  const { data: orders, error: oe } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (oe) throw new Error(oe.message);
  const list = (orders ?? []) as DbOrderRow[];

  if (list.length === 0) return [];

  const orderIds = list.map((o) => o.id);
  const { data: rawItems, error: ie } = await supabase
    .from('order_items')
    .select('id,order_id,product_id,quantity,price')
    .in('order_id', orderIds);

  if (ie) throw new Error(ie.message);
  const items = (rawItems ?? []) as DbOrderItemRow[];

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  let productsById = new Map<string, DbProductRow>();

  if (productIds.length) {
    const { data: prodRows, error: pe } = await supabase
      .from('products')
      .select('id,name,price,images')
      .in('id', productIds);

    if (!pe && prodRows) {
      productsById = new Map(prodRows.map((p) => [String((p as DbProductRow).id), p as DbProductRow]));
    }
  }

  const itemsByOrder = new Map<string, OrderWithItems['items']>();
  for (const o of list) itemsByOrder.set(o.id, []);

  for (const it of items) {
    const p = productsById.get(it.product_id) ?? null;
    const enriched = {
      ...it,
      price: typeof it.price === 'string' ? parseFloat(it.price) : Number(it.price),
      product: p,
    };
    const bucket = itemsByOrder.get(it.order_id);
    if (bucket) bucket.push(enriched);
  }

  return list.map((o) => ({
    ...o,
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export function summarizeOrders(rows: OrderWithItems[]) {
  const totalOrders = rows.length;
  const pendingOrders = rows.filter((r) => String(r.status).toLowerCase() === 'pending').length;
  const totalSpent = rows
    .filter((r) => String(r.status).toLowerCase() !== 'cancelled')
    .reduce((sum, r) => sum + orderRowTotal(r), 0);

  const recentFive = [...rows].slice(0, 5);

  return { totalOrders, pendingOrders, totalSpent, recentFive };
}
