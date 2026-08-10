'use server';

import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createWarehouseAndStaff,
  provisionStaffMember,
  StaffError,
  type AuthApi,
  type DbService,
  type WarehouseService,
} from '@/lib/warehouse-staff-service';

// -----------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------
async function getAdmin(permission = 'inventory.view') {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('No Supabase client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) throw new Error('Forbidden');
  const { requirePermission } = await import('./security');
  await requirePermission(permission);
  return { supabase, user };
}

// -----------------------------------------------------------------------
// Staff-provisioning adapters (wrap the service-role client so ALL writes
// bypass RLS, and use auth.admin as the authoritative account source).
// -----------------------------------------------------------------------
function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type ServiceClient = ReturnType<typeof makeServiceClient>;

function makeAuthApi(sb: ServiceClient): AuthApi {
  return {
    async findByEmail(email) {
      // Source of truth = auth.users (NOT profiles). Scan is bounded.
      const needle = email.trim().toLowerCase();
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new StaffError('AUTH_API_ERROR', `Could not look up auth users: ${error.message}`);
        const users = (data?.users ?? []) as Array<{ id: string; email?: string; deleted_at?: string | null }>;
        const hit = users.find((u) => !u.deleted_at && u.email && u.email.toLowerCase() === needle);
        if (hit) return { id: hit.id, email: hit.email!, deleted_at: null };
        const pagination = (data as unknown as { nextPage?: number })?.nextPage;
        if (!pagination) break;
      }
      return null;
    },
    async findSoftDeletedByEmail(email) {
      // auth.admin.listUsers includes soft-deleted (banned) users with deleted_at set.
      const needle = email.trim().toLowerCase();
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new StaffError('AUTH_API_ERROR', `Could not look up soft-deleted auth users: ${error.message}`);
        const users = (data?.users ?? []) as Array<{ id: string; email?: string; deleted_at?: string | null }>;
        const hit = users.find((u) => !!u.deleted_at && u.email && u.email.toLowerCase() === needle);
        if (hit) return { id: hit.id, email: hit.email!, deleted_at: hit.deleted_at };
        const pagination = (data as unknown as { nextPage?: number })?.nextPage;
        if (!pagination) break;
      }
      return null;
    },
    async createUser(input) {
      const { data, error } = await sb.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: input.email_confirm,
        user_metadata: input.user_metadata,
      });
      if (error) {
        const errAny = error as unknown as {
          status?: number; code?: string; name?: string; reasons?: string[];
          toJSON?: () => unknown;
        };
        return {
          user: null,
          error: {
            message: error.message,
            status: errAny.status,
            code: errAny.code,
            name: errAny.name,
            weak_password: Array.isArray(errAny.reasons) ? { reasons: errAny.reasons } : undefined,
            raw: typeof errAny.toJSON === 'function' ? errAny.toJSON() : undefined,
          },
        };
      }
      const u = data?.user;
      if (!u) return { user: null, error: { message: 'No user returned from createUser' } };
      return { user: { id: u.id, email: u.email ?? input.email, deleted_at: null }, error: null };
    },
    async hardDeleteUser(id) {
      const { error } = await sb.auth.admin.deleteUser(id, true); // hard delete (purges soft-deleted duplicates)
      return { error: error?.message };
    },
    async updateUserMetadata(id, metadata) {
      const { error } = await sb.auth.admin.updateUserById(id, { user_metadata: metadata });
      return { error: error?.message };
    },
  };
}

function makeDbService(sb: ServiceClient): DbService {
  return {
    async warehouseExists(id) {
      const { data, error } = await sb.from('warehouses').select('id').eq('id', id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    async ensureProfile(p) {
      const { error } = await sb.from('profiles').upsert(p, { onConflict: 'id' });
      return error ? { ok: false, message: error.message } : { ok: true };
    },
    async purgeOrphanProfilesByEmail(email, keepUserId) {
      try {
        const { data: profiles, error } = await sb
          .from('profiles')
          .select('id')
          .ilike('email', email.trim().toLowerCase());
        if (error) return { ok: false, error: error.message };
        for (const prof of (profiles ?? [])) {
          if (prof.id === keepUserId) continue;
          // orphan = the profile id is not backed by a live auth user
          const { data: au, error: auErr } = await sb.auth.admin.getUserById(prof.id);
          if (auErr || !au?.user) {
            try { await sb.from('profiles').delete().eq('id', prof.id); } catch { /* keep, will surface later */ }
          }
        }
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message ?? 'unknown' };
      }
    },
    async warehouseStaffRoleId() {
      const { data, error } = await sb.from('roles').select('id').eq('name', 'warehouse_staff').maybeSingle();
      if (error) return { error: error.message };
      return { id: data?.id, error: undefined };
    },
    async assignRole(userId, roleId) {
      const { error } = await sb.from('user_roles').upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id,role_id' });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async createNotification(input) {
      const { error } = await sb.from('notifications').insert({
        title: input.title,
        message: input.message,
        type: input.type,
        is_read: false,
        warehouse_id: input.warehouse_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async revertStaffing(userId) {
      const { data: role } = await sb.from('roles').select('id').eq('name', 'warehouse_staff').maybeSingle();
      if (role?.id) await sb.from('user_roles').delete().eq('user_id', userId).eq('role_id', role.id);
      await sb.from('profiles').update({ is_warehouse_staff: false, assigned_warehouse_id: null }).eq('id', userId);
      return { ok: true };
    },
  };
}

function makeWarehouseApi(sb: ServiceClient): WarehouseService {
  return {
    async createWarehouse(data) {
      const { data: inserted, error } = await sb.from('warehouses').insert(data).select('id').single();
      if (error) return { error: { message: error.message } };
      return { id: inserted?.id, error: undefined };
    },
    async deleteWarehouse(id) {
      const { error } = await sb.from('warehouses').delete().eq('id', id);
      return { error: error?.message };
    },
  };
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
  const { supabase, user } = await getAdmin('inventory.edit');
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

  // Increment total_added when product stock increases (not for variants)
  if (actualChange > 0 && !variantId) {
    const { data: prod } = await supabase
      .from('products')
      .select('total_added')
      .eq('id', productId)
      .single();
    const currentTotal = prod?.total_added ?? 0;
    await supabase
      .from('products')
      .update({ total_added: currentTotal + actualChange })
      .eq('id', productId);
  }

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
  phone?: string; email?: string;   capacity?: number;
}) {
  const { supabase } = await getAdmin('inventory.manage');
  const { data: inserted, error } = await supabase.from('warehouses').insert(data).select('id').single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/warehouses');
  return { success: true, id: inserted?.id };
}

/**
 * Create a warehouse with optional staff member in a single atomic operation.
 * If staff creation fails, the warehouse is rolled back.
 * If warehouse creation fails, no staff is created.
 */
export async function createWarehouseWithStaff(params: {
  warehouse: {
    name: string;
    slug: string;
    location?: string;
    manager?: string;
    phone?: string;
    email?: string;
    capacity?: number;
  };
  staff?: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  };
}) {
  console.log('[WAREHOUSE_CREATE] Starting atomic warehouse + staff creation');
  console.log('[WAREHOUSE_CREATE] Warehouse:', params.warehouse.name);
  console.log('[WAREHOUSE_CREATE] Staff requested:', !!params.staff);

  // Verify the caller is an authorized inventory manager first.
  await getAdmin('inventory.manage');

  const sb = makeServiceClient();
  const result = await createWarehouseAndStaff(makeAuthApi(sb), makeDbService(sb), makeWarehouseApi(sb), {
    warehouse: {
      name: params.warehouse.name,
      slug: params.warehouse.slug,
      location: params.warehouse.location ?? null,
      manager: params.warehouse.manager ?? null,
      phone: params.warehouse.phone ?? null,
      email: params.warehouse.email ?? null,
      capacity: params.warehouse.capacity ?? null,
    },
    staff: params.staff
      ? {
          email: params.staff.email,
          password: params.staff.password,
          full_name: params.staff.full_name,
          phone: params.staff.phone ?? null,
        }
      : null,
  });

  revalidatePath('/admin/inventory/warehouses');
  if (result.staffCreated) revalidatePath('/admin/inventory/warehouses/[id]');

  return {
    success: true,
    warehouseId: result.warehouseId,
    staffCreated: result.staffCreated,
    userId: result.userId,
    email: params.staff?.email,
  };
}

export async function updateWarehouse(id: string, data: Partial<{
  name: string; slug: string; location: string; manager: string;
  phone: string; email: string; capacity: number; is_active: boolean;
}>) {
  const { supabase } = await getAdmin('inventory.manage');
  const { error } = await supabase.from('warehouses').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}

export async function deleteWarehouse(id: string) {
  const { supabase } = await getAdmin('inventory.manage');
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
  const { supabase } = await getAdmin('inventory.manage');
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
  const { supabase } = await getAdmin('inventory.manage');
  const { error } = await supabase.from('suppliers').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/suppliers');
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const { supabase } = await getAdmin('inventory.manage');
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
  const { supabase, user } = await getAdmin('inventory.manage');
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
  const { supabase } = await getAdmin('inventory.manage');
  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', poId).single();
  if (!po) throw new Error('Purchase order not found');
  if (po.status === 'received') throw new Error('Already received');

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('*, products(stock, total_added)')
    .eq('purchase_order_id', poId);

  for (const item of items || []) {
    const remaining = item.quantity - item.received_quantity;
    if (remaining <= 0) continue;

    const { error: stockErr } = await supabase
      .from('products')
      .update({ stock: (item.products?.stock || 0) + remaining, incoming_stock: Math.max(0, (item.products?.stock || 0) - remaining) })
      .eq('id', item.product_id);
    if (stockErr) throw new Error(stockErr.message);

    // Increment total_added for received stock
    await supabase
      .from('products')
      .update({ total_added: ((item.products as any)?.total_added ?? (item.products?.stock || 0)) + remaining })
      .eq('id', item.product_id);

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
  const { supabase } = await getAdmin('inventory.manage');
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', poId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/purchase-orders');
  return { success: true };
}

export async function deletePurchaseOrder(poId: string) {
  const { supabase } = await getAdmin('inventory.manage');
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
  const { supabase, user } = await getAdmin('inventory.edit');
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
  const { supabase, user } = await getAdmin('inventory.edit');

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

  // Increment total_added for the destination product (new stock entered via transfer)
  const { data: destProd } = await supabase
    .from('products')
    .select('total_added')
    .eq('id', transfer.product_id)
    .single();
  const destTotal = (destProd?.total_added ?? (product?.stock || 0)) + transfer.quantity;
  await supabase
    .from('products')
    .update({ total_added: destTotal })
    .eq('id', transfer.product_id);

  await supabase.from('stock_transfers').update({
    status: 'completed',
    completed_by: user.id,
    completed_at: new Date().toISOString(),
  }).eq('id', transferId);

  revalidatePath('/admin/inventory/transfers');
  return { success: true };
}

export async function updateTransferStatus(transferId: string, status: string) {
  const { supabase } = await getAdmin('inventory.edit');
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
  const { supabase } = await getAdmin('inventory.edit');
  for (const u of updates) {
    const { data: current } = await supabase.from('products').select('stock, total_added').eq('id', u.product_id).single();
    const change = u.stock - (current?.stock || 0);
    if (change !== 0) {
      await supabase.from('products').update({ stock: u.stock }).eq('id', u.product_id);
      // Increment total_added if stock increased
      if (change > 0) {
        const curTotal = current?.total_added ?? current?.stock ?? 0;
        await supabase.from('products').update({ total_added: curTotal + change }).eq('id', u.product_id);
      }
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
  const { supabase } = await getAdmin('inventory.edit');
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
  const { supabase, user } = await getAdmin('inventory.edit');
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
  const { supabase, user } = await getAdmin('inventory.edit');
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
  const { supabase } = await getAdmin('inventory.manage');
  const { error } = await supabase.from('products').update({ default_warehouse_id: warehouseId }).eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/inventory/products');
  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}

// -----------------------------------------------------------------------
// Warehouse Staff Management
// -----------------------------------------------------------------------
export async function getWarehouseStaff(warehouseId: string) {
  const { supabase } = await getAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, created_at')
    .eq('assigned_warehouse_id', warehouseId)
    .eq('is_warehouse_staff', true)
    .order('full_name');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function assignStaffToWarehouse(userId: string, warehouseId: string) {
  await getAdmin('inventory.manage');

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Use service-role client so the prevent_privilege_escalation trigger
  // does not block the sensitive column updates (assigned_warehouse_id, etc.)
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      is_warehouse_staff: true,
      assigned_warehouse_id: warehouseId,
      user_type: 'internal',
      role: 'warehouse_staff',
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);

  // Sync auth user_metadata for login redirect detection
  try {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { is_warehouse_staff: true, assigned_warehouse_id: warehouseId, role: 'warehouse_staff', user_type: 'internal' },
    });

    // Ensure the warehouse_staff RBAC role is assigned
    const { data: staffRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'warehouse_staff')
      .maybeSingle();

    if (staffRole) {
      await supabaseAdmin.from('user_roles').upsert({
        user_id: userId,
        role_id: staffRole.id,
      }, { onConflict: 'user_id,role_id' });
    }
  } catch (metaErr) {
    console.error('Failed to sync auth metadata (non-fatal):', metaErr);
  }

  revalidatePath(`/admin/inventory/warehouses/${warehouseId}`);
  return { success: true };
}

export async function removeStaffFromWarehouse(userId: string) {
  const { supabase } = await getAdmin('inventory.manage');
  const { data: current, error: curErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (curErr) throw new Error(curErr.message);
  const updates: any = { is_warehouse_staff: false, assigned_warehouse_id: null };
  if ((current as any)?.role === 'warehouse_staff') {
    updates.user_type = 'customer';
    updates.role = 'customer';
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Use service-role client so the prevent_privilege_escalation trigger
  // does not block the sensitive column updates.
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw new Error(error.message);

  // Sync auth user_metadata for login redirect detection
  try {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { is_warehouse_staff: false, assigned_warehouse_id: null, role: 'customer', user_type: 'customer' },
    });

    // Remove the warehouse_staff RBAC role
    const { data: staffRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'warehouse_staff')
      .maybeSingle();

    if (staffRole) {
      await supabaseAdmin.from('user_roles').delete()
        .eq('user_id', userId)
        .eq('role_id', staffRole.id);
    }
  } catch (metaErr) {
    console.error('Failed to sync auth metadata (non-fatal):', metaErr);
  }

  revalidatePath('/admin/inventory/warehouses');
  return { success: true };
}

export async function getUnassignedStaff() {
  const { supabase } = await getAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('is_warehouse_staff', false)
    .is('assigned_warehouse_id', null)
    .order('full_name');
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create warehouse staff for an existing warehouse.
 * @deprecated Use createWarehouseWithStaff() instead for new warehouses.
 */
export async function createWarehouseStaff(params: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  warehouseId: string;
}) {
  await getAdmin('inventory.manage');

  const sb = makeServiceClient();
  const result = await provisionStaffMember(makeAuthApi(sb), makeDbService(sb), {
    email: params.email,
    password: params.password,
    full_name: params.full_name,
    phone: params.phone ?? null,
    warehouseId: params.warehouseId,
  });

  revalidatePath(`/admin/inventory/warehouses/${params.warehouseId}`);
  revalidatePath('/admin/inventory/warehouses');

  return { user: { id: result.userId, email: result.email } };
}

// -----------------------------------------------------------------------
// Warehouse Staff + Admin Product Actions
// -----------------------------------------------------------------------
async function requireWarehouseStaffOrAdmin(permission = 'inventory.view') {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('No Supabase client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles')
    .select('role, is_warehouse_staff, assigned_warehouse_id')
    .eq('id', user.id).single();
  if (!profile) throw new Error('Forbidden');
  const { requirePermission } = await import('./security');
  await requirePermission(permission);
  const isWarehouseStaff = profile.is_warehouse_staff === true;
  return { supabase, user, profile, isWarehouseStaff };
}

export async function getWarehouseProducts(warehouseId: string) {
  const { supabase, profile } = await requireWarehouseStaffOrAdmin();
  if (profile.is_warehouse_staff && profile.assigned_warehouse_id !== warehouseId) throw new Error('Access denied to this warehouse');
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, slug, price, stock, reserved_stock, min_stock_level, stock_status, is_active, default_warehouse_id, cost_price, categories:categories(name), brands:brands(name)')
    .eq('default_warehouse_id', warehouseId)
    .order('name');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function warehouseUpdateStock(productId: string, newStock: number, reason?: string) {
  const { supabase, profile } = await requireWarehouseStaffOrAdmin('inventory.edit');
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('id, stock, total_added, default_warehouse_id')
    .eq('id', productId).single();
  if (pErr || !product) throw new Error('Product not found');
  if (profile.is_warehouse_staff && product.default_warehouse_id !== profile.assigned_warehouse_id) {
    throw new Error('You can only update stock for products in your warehouse');
  }
  const oldStock = product.stock || 0;
  const diff = newStock - oldStock;
  const { error: upErr } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);
  if (upErr) throw new Error(upErr.message);

  // Increment total_added if stock increased
  if (diff > 0) {
    const curTotal = (product as any).total_added ?? oldStock;
    await supabase
      .from('products')
      .update({ total_added: curTotal + diff })
      .eq('id', productId);
  }
  try {
    await supabase.from('stock_movements').insert({
      product_id: productId,
      warehouse_id: product.default_warehouse_id,
      movement_type: diff > 0 ? 'manual_update' : 'manual_update',
      quantity_change: Math.abs(diff),
      stock_before: oldStock,
      stock_after: newStock,
      reference_type: reason || 'Manual stock update by warehouse staff',
      performed_by: (await supabase.auth.getUser()).data.user?.id,
    });
  } catch (_) {}
  revalidatePath('/admin/warehouse/products');
  revalidatePath('/admin/inventory/products');
  return { success: true };
}

export async function warehouseAssignProduct(productId: string, warehouseId: string | null) {
  const { supabase, profile } = await requireWarehouseStaffOrAdmin('inventory.manage');
  if (profile.is_warehouse_staff && warehouseId !== null && warehouseId !== profile.assigned_warehouse_id) {
    throw new Error('You can only assign products to your own warehouse');
  }
  const { error } = await supabase
    .from('products')
    .update({ default_warehouse_id: warehouseId })
    .eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/warehouse/products');
  revalidatePath('/admin/inventory/products');
  return { success: true };
}

export async function warehouseUpdateProduct(productId: string, updates: { price?: number; name?: string; description?: string; is_active?: boolean }) {
  const { supabase, profile } = await requireWarehouseStaffOrAdmin('inventory.edit');
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('id, default_warehouse_id')
    .eq('id', productId).single();
  if (pErr || !product) throw new Error('Product not found');
  if (profile.is_warehouse_staff && product.default_warehouse_id !== profile.assigned_warehouse_id) {
    throw new Error('You can only update products in your warehouse');
  }
  const payload: Record<string, any> = {};
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;
  if (Object.keys(payload).length === 0) return { success: true };
  const { error } = await supabase.from('products').update(payload).eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/warehouse/products');
  revalidatePath('/admin/inventory/products');
  return { success: true };
}

export async function getAllActiveWarehouses() {
  const { supabase } = await requireWarehouseStaffOrAdmin();
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data || [];
}
