'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// -----------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------
async function getAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('No Supabase client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Forbidden');
  return { supabase, user };
}

// -----------------------------------------------------------------------
// Inventory Stats
// -----------------------------------------------------------------------
export async function getInventoryStats() {
  try {
    const { supabase } = await getAdmin();

    const { count: total_products } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: active_products } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: low_stock_count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'low_stock');
    const { count: out_of_stock_count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'out_of_stock');

    const { data: stockData } = await supabase.from('products').select('stock, reserved_stock, incoming_stock, cost_price, price');
    let total_stock = 0;
    let reserved_stock = 0;
    let incoming_stock = 0;
    let total_inventory_value = 0;

    stockData?.forEach(p => {
      total_stock += p.stock || 0;
      reserved_stock += p.reserved_stock || 0;
      incoming_stock += p.incoming_stock || 0;
      total_inventory_value += (p.cost_price || 0) * (p.stock || 0);
    });

    return {
      total_products: total_products || 0,
      active_products: active_products || 0,
      total_stock,
      reserved_stock,
      incoming_stock,
      low_stock_count: low_stock_count || 0,
      out_of_stock_count: out_of_stock_count || 0,
      total_inventory_value,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------
// Stock Adjustments
// -----------------------------------------------------------------------
export async function adjustStock(
  productId: string,
  quantityChange: number,
  reason: string,
  movementType: 'stock_added' | 'stock_removed' | 'adjustment' | 'damage' | 'lost' = 'adjustment',
  variantId?: string,
  warehouseId?: string,
  notes?: string,
) {
  const { supabase, user } = await getAdmin();
  if (quantityChange === 0) throw new Error('Quantity change must be non-zero');

  const table = variantId ? 'product_variants' : 'products';
  const idField = variantId ? 'id' : 'id';
  const idValue = variantId || productId;
  const productFilter = variantId ? { id: variantId, product_id: productId } : { id: productId };

  const { data: current } = await supabase
    .from(table)
    .select('stock')
    .eq(idField, idValue)
    .single();

  if (!current) throw new Error('Product/variant not found');

  const stockBefore = current.stock;
  const stockAfter = Math.max(0, stockBefore + quantityChange);
  const actualChange = stockAfter - stockBefore;

  if (actualChange === 0) return { success: true, message: 'No change needed' };

  const { error: updateError } = await supabase
    .from(table)
    .update({ stock: stockAfter })
    .eq(idField, idValue);

  if (updateError) throw new Error(updateError.message);

  await supabase.from('stock_movements').insert({
    product_id: productId,
    variant_id: variantId || null,
    warehouse_id: warehouseId || null,
    movement_type: movementType,
    quantity_change: actualChange,
    stock_before: stockBefore,
    stock_after: stockAfter,
    reference_type: reason,
    notes: notes || null,
    performed_by: user.id,
  });

  revalidatePath('/admin/inventory');
  return { success: true, message: `Stock updated from ${stockBefore} to ${stockAfter}` };
}

// -----------------------------------------------------------------------
// Warehouses
// -----------------------------------------------------------------------
export async function getWarehouses() {
  const { supabase } = await getAdmin();
  const { data } = await supabase.from('warehouses').select('*').order('name');
  return data || [];
}

export async function createWarehouse(data: {
  name: string; slug: string; location?: string; manager?: string;
  phone?: string; email?: string; capacity?: number;
}) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('warehouses').insert(data);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}

export async function updateWarehouse(id: string, data: Partial<{
  name: string; slug: string; location: string; manager: string;
  phone: string; email: string; capacity: number; is_active: boolean;
}>) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('warehouses').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}

export async function deleteWarehouse(id: string) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('warehouses').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}

// -----------------------------------------------------------------------
// Suppliers
// -----------------------------------------------------------------------
export async function getSuppliers() {
  const { supabase } = await getAdmin();
  const { data } = await supabase.from('suppliers').select('*').order('name');
  return data || [];
}

export async function createSupplier(data: {
  name: string; slug: string; contact_person?: string; email?: string;
  phone?: string; address?: string; city?: string; country?: string;
  payment_terms?: string; tax_id?: string; notes?: string;
}) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('suppliers').insert({ ...data, country: data.country || 'Bangladesh' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/suppliers');
  return { success: true };
}

export async function updateSupplier(id: string, data: Partial<{
  name: string; slug: string; contact_person: string; email: string;
  phone: string; address: string; city: string; country: string;
  payment_terms: string; tax_id: string; notes: string; is_active: boolean;
}>) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('suppliers').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/suppliers');
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/suppliers');
  return { success: true };
}

// -----------------------------------------------------------------------
// Purchase Orders
// -----------------------------------------------------------------------
export async function getPurchaseOrders() {
  const { supabase } = await getAdmin();
  const { data } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), warehouses(name)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getPurchaseOrder(id: string) {
  const { supabase } = await getAdmin();
  const { data } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(*), warehouses(*), purchase_order_items(*)')
    .eq('id', id)
    .single();
  return data;
}

function generatePONumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${ts}-${rand}`;
}

export async function createPurchaseOrder(data: {
  supplier_id: string; warehouse_id?: string; expected_date?: string;
  invoice_number?: string; notes?: string; items: {
    product_id: string; variant_id?: string; quantity: number;
    unit_cost: number;
  }[];
}) {
  const { supabase, user } = await getAdmin();
  if (!data.items.length) throw new Error('At least one item required');

  const po_number = generatePONumber();
  const subtotal = data.items.reduce((s, i) => s + i.unit_cost * i.quantity, 0);

  const { data: po, error } = await supabase.from('purchase_orders').insert({
    po_number,
    supplier_id: data.supplier_id,
    warehouse_id: data.warehouse_id || null,
    expected_date: data.expected_date || null,
    invoice_number: data.invoice_number || null,
    notes: data.notes || null,
    subtotal,
    total_cost: subtotal,
    created_by: user.id,
  }).select('id').single();

  if (error) throw new Error(error.message);

  const items = data.items.map(i => ({
    purchase_order_id: po.id,
    product_id: i.product_id,
    variant_id: i.variant_id || null,
    quantity: i.quantity,
    unit_cost: i.unit_cost,
    total_cost: i.unit_cost * i.quantity,
  }));

  const { error: itemsError } = await supabase.from('purchase_order_items').insert(items);
  if (itemsError) throw new Error(itemsError.message);

  revalidatePath('/admin/inventory/purchase-orders');
  return { success: true, po_number };
}

export async function receivePurchaseOrder(poId: string) {
  const { supabase } = await getAdmin();
  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', poId).single();
  if (!po) throw new Error('Purchase order not found');
  if (po.status === 'received') throw new Error('Already received');

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('*, products(stock)')
    .eq('purchase_order_id', poId);

  for (const item of items || []) {
    const remaining = item.quantity - item.received_quantity;
    if (remaining <= 0) continue;

    const { error: stockErr } = await supabase
      .from('products')
      .update({ stock: (item.products?.stock || 0) + remaining, incoming_stock: Math.max(0, (item.products?.stock || 0) - remaining) })
      .eq('id', item.product_id);
    if (stockErr) throw new Error(stockErr.message);

    await supabase.from('stock_movements').insert({
      product_id: item.product_id,
      variant_id: item.variant_id,
      warehouse_id: po.warehouse_id,
      movement_type: 'purchase',
      quantity_change: remaining,
      stock_before: item.products?.stock || 0,
      stock_after: (item.products?.stock || 0) + remaining,
      reference_type: 'purchase_order',
      reference_id: poId,
      notes: `PO ${po.po_number} received`,
    });

    await supabase.from('purchase_order_items').update({ received_quantity: item.quantity }).eq('id', item.id);
  }

  await supabase.from('purchase_orders').update({ status: 'received', received_date: new Date().toISOString() }).eq('id', poId);
  revalidatePath('/admin/inventory/purchase-orders');
  return { success: true };
}

export async function updatePurchaseOrderStatus(poId: string, status: string) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', poId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/purchase-orders');
  return { success: true };
}

export async function deletePurchaseOrder(poId: string) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('purchase_orders').delete().eq('id', poId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/purchase-orders');
  return { success: true };
}

// -----------------------------------------------------------------------
// Stock Transfers
// -----------------------------------------------------------------------
export async function getStockTransfers() {
  const { supabase } = await getAdmin();
  const { data } = await supabase
    .from('stock_transfers')
    .select('*, products(name,sku), from_warehouse:from_warehouse_id(name), to_warehouse:to_warehouse_id(name)')
    .order('created_at', { ascending: false });
  return data || [];
}

function generateTransferNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `TRF-${ts}`;
}

export async function createStockTransfer(data: {
  product_id: string; variant_id?: string; quantity: number;
  from_warehouse_id: string; to_warehouse_id: string; notes?: string;
}) {
  const { supabase, user } = await getAdmin();
  if (data.from_warehouse_id === data.to_warehouse_id) throw new Error('Cannot transfer to same warehouse');

  const { data: product } = await supabase.from('products').select('stock').eq('id', data.product_id).single();
  if (!product) throw new Error('Product not found');
  if (data.quantity > (product.stock || 0)) throw new Error('Insufficient stock');

  const transfer_number = generateTransferNumber();
  const { error } = await supabase.from('stock_transfers').insert({
    transfer_number,
    product_id: data.product_id,
    variant_id: data.variant_id || null,
    quantity: data.quantity,
    from_warehouse_id: data.from_warehouse_id,
    to_warehouse_id: data.to_warehouse_id,
    notes: data.notes || null,
    requested_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/transfers');
  return { success: true, transfer_number };
}

export async function completeStockTransfer(transferId: string) {
  const { supabase, user } = await getAdmin();

  const { data: transfer } = await supabase.from('stock_transfers').select('*').eq('id', transferId).single();
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.status !== 'in_transit') throw new Error('Transfer must be in_transit to complete');

  const { data: product } = await supabase.from('products').select('stock').eq('id', transfer.product_id).single();

  await supabase.from('stock_movements').insert({
    product_id: transfer.product_id,
    variant_id: transfer.variant_id,
    warehouse_id: transfer.from_warehouse_id,
    movement_type: 'transfer_out',
    quantity_change: -transfer.quantity,
    stock_before: product?.stock || 0,
    stock_after: (product?.stock || 0) - transfer.quantity,
    reference_type: 'stock_transfer',
    reference_id: transferId,
    notes: `Transfer out to ${transfer.to_warehouse_id}`,
    performed_by: user.id,
  });

  await supabase.from('products').update({ stock: (product?.stock || 0) - transfer.quantity }).eq('id', transfer.product_id);

  await supabase.from('stock_movements').insert({
    product_id: transfer.product_id,
    variant_id: transfer.variant_id,
    warehouse_id: transfer.to_warehouse_id,
    movement_type: 'transfer_in',
    quantity_change: transfer.quantity,
    stock_before: product?.stock || 0,
    stock_after: (product?.stock || 0) - transfer.quantity + transfer.quantity,
    reference_type: 'stock_transfer',
    reference_id: transferId,
    notes: `Transfer in from ${transfer.from_warehouse_id}`,
    performed_by: user.id,
  });

  await supabase.from('products').update({ stock: (product?.stock || 0) + transfer.quantity }).eq('id', transfer.product_id);

  await supabase.from('stock_transfers').update({
    status: 'completed',
    completed_by: user.id,
    completed_at: new Date().toISOString(),
  }).eq('id', transferId);

  revalidatePath('/admin/inventory/transfers');
  return { success: true };
}

export async function updateTransferStatus(transferId: string, status: string) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('stock_transfers').update({ status }).eq('id', transferId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/transfers');
  return { success: true };
}

// -----------------------------------------------------------------------
// Stock Movements (history)
// -----------------------------------------------------------------------
export async function getStockMovements(options?: {
  product_id?: string; limit?: number; offset?: number;
}) {
  const { supabase } = await getAdmin();
  let query = supabase
    .from('stock_movements')
    .select('*, products(name,sku), profiles(full_name)')
    .order('created_at', { ascending: false });

  if (options?.product_id) query = query.eq('product_id', options.product_id);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  const { data } = await query;
  return data || [];
}

// -----------------------------------------------------------------------
// Product Inventory List (with filters)
// -----------------------------------------------------------------------
export async function getProductInventory(options?: {
  search?: string; category_id?: string; brand_id?: string;
  stock_status?: string; warehouse_id?: string; supplier_id?: string;
  page?: number; page_size?: number;
}) {
  const { supabase } = await getAdmin();
  const page = options?.page || 1;
  const pageSize = options?.page_size || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select('*, categories(name), brands(name)', { count: 'exact' });

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,sku.ilike.%${options.search}%,barcode.ilike.%${options.search}%`);
  }
  if (options?.category_id) query = query.eq('category_id', options.category_id);
  if (options?.brand_id) query = query.eq('brand_id', options.brand_id);
  if (options?.stock_status) query = query.eq('stock_status', options.stock_status);
  if (options?.warehouse_id) query = query.eq('default_warehouse_id', options.warehouse_id);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { products: data || [], total: count || 0, page, pageSize };
}

// -----------------------------------------------------------------------
// Bulk Operations
// -----------------------------------------------------------------------
export async function bulkUpdateStock(updates: { product_id: string; stock: number }[]) {
  const { supabase } = await getAdmin();
  for (const u of updates) {
    const { data: current } = await supabase.from('products').select('stock').eq('id', u.product_id).single();
    const change = u.stock - (current?.stock || 0);
    if (change !== 0) {
      await supabase.from('products').update({ stock: u.stock }).eq('id', u.product_id);
      await supabase.from('stock_movements').insert({
        product_id: u.product_id,
        movement_type: 'manual_update',
        quantity_change: change,
        stock_before: current?.stock || 0,
        stock_after: u.stock,
        reference_type: 'bulk_update',
      });
    }
  }
  revalidatePath('/admin/inventory');
  return { success: true };
}

export async function bulkUpdateStatus(updates: { product_id: string; is_active: boolean }[]) {
  const { supabase } = await getAdmin();
  for (const u of updates) {
    await supabase.from('products').update({ is_active: u.is_active }).eq('id', u.product_id);
  }
  revalidatePath('/admin/inventory');
  return { success: true };
}

// -----------------------------------------------------------------------
// Inventory Value Report
// -----------------------------------------------------------------------
export async function getInventoryReport() {
  const { supabase } = await getAdmin();
  const { data } = await supabase
    .from('products')
    .select('id, name, sku, stock, cost_price, price, stock_status, category_id, categories(name)');

  const report = (data || []).map(p => ({
    ...p,
    stock_value: (p.cost_price || 0) * (p.stock || 0),
    potential_revenue: (p.price || 0) * (p.stock || 0),
  }));

  const total_value = report.reduce((s, p) => s + (p.stock_value || 0), 0);
  const total_revenue = report.reduce((s, p) => s + (p.potential_revenue || 0), 0);

  return { items: report, total_value, total_revenue };
}

// -----------------------------------------------------------------------
// Deduct / Restore stock on order events
// -----------------------------------------------------------------------
export async function deductStockForOrder(orderId: string) {
  const { supabase, user } = await getAdmin();
  const { data: items } = await supabase.from('order_items').select('*, products!inner(stock)').eq('order_id', orderId);
  if (!items?.length) return;

  for (const item of items) {
    const productId = typeof item.product_id === 'string' ? item.product_id : item.product_id.toString();
    const stockBefore = item.products?.stock || 0;
    const qty = item.quantity || 0;

    await supabase.from('products').update({ stock: Math.max(0, stockBefore - qty) }).eq('id', productId);

    await supabase.from('stock_movements').insert({
      product_id: productId,
      variant_id: item.variant_id,
      movement_type: 'sale',
      quantity_change: -qty,
      stock_before: stockBefore,
      stock_after: Math.max(0, stockBefore - qty),
      reference_type: 'order',
      reference_id: orderId,
      notes: `Order #${orderId} deduction`,
      performed_by: user.id,
    });
  }
}

export async function restoreStockForReturn(orderId: string) {
  const { supabase, user } = await getAdmin();
  const { data: items } = await supabase.from('order_items').select('*, products!inner(stock)').eq('order_id', orderId);
  if (!items?.length) return;

  for (const item of items) {
    const productId = typeof item.product_id === 'string' ? item.product_id : item.product_id.toString();
    const stockBefore = item.products?.stock || 0;
    const qty = item.quantity || 0;

    await supabase.from('products').update({ stock: stockBefore + qty }).eq('id', productId);

    await supabase.from('stock_movements').insert({
      product_id: productId,
      variant_id: item.variant_id,
      movement_type: 'return',
      quantity_change: qty,
      stock_before: stockBefore,
      stock_after: stockBefore + qty,
      reference_type: 'return',
      reference_id: orderId,
      notes: `Return restoration for order #${orderId}`,
      performed_by: user.id,
    });
  }
}

// -----------------------------------------------------------------------
// Warehouse Detail & Stats
// -----------------------------------------------------------------------
export async function getWarehouseDetail(warehouseId: string) {
  const { supabase } = await getAdmin();
  const { data: warehouse } = await supabase.from('warehouses').select('*').eq('id', warehouseId).single();
  if (!warehouse) throw new Error('Warehouse not found');

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('default_warehouse_id', warehouseId);

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, stock, stock_status, price, cost_price, min_stock_level')
    .eq('default_warehouse_id', warehouseId)
    .order('name');

  const { data: recentMovements } = await supabase
    .from('stock_movements')
    .select('*, products(name, sku)')
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: transfersOut } = await supabase
    .from('stock_transfers')
    .select('transfer_number, quantity, status, created_at, to_warehouse:to_warehouse_id(name)')
    .eq('from_warehouse_id', warehouseId)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: transfersIn } = await supabase
    .from('stock_transfers')
    .select('transfer_number, quantity, status, created_at, from_warehouse:from_warehouse_id(name)')
    .eq('to_warehouse_id', warehouseId)
    .order('created_at', { ascending: false })
    .limit(10);

  const totalStock = (products || []).reduce((s, p) => s + (p.stock || 0), 0);
  const totalValue = (products || []).reduce((s, p) => s + (p.cost_price || 0) * (p.stock || 0), 0);
  const lowStock = (products || []).filter(p => p.stock_status === 'low_stock' || p.stock_status === 'out_of_stock').length;

  return {
    warehouse,
    productCount: productCount || 0,
    totalStock,
    totalValue,
    lowStock,
    capacityUsed: warehouse.capacity ? Math.round((totalStock / warehouse.capacity) * 100) : 0,
    products: products || [],
    recentMovements: recentMovements || [],
    transfersOut: transfersOut || [],
    transfersIn: transfersIn || [],
  };
}

export async function updateProductDefaultWarehouse(productId: string, warehouseId: string | null) {
  const { supabase } = await getAdmin();
  const { error } = await supabase.from('products').update({ default_warehouse_id: warehouseId }).eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/products');
  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}
