'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getAccountingDashboardData(fromDate?: string, toDate?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('accounts.view');
  } catch {
    return null;
  }

  const now = new Date();
  const from = fromDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = toDate || now.toISOString();

  const [expenseCatRes, expenseRes, plRes, cashFlowRes, customerDueRes] = await Promise.all([
    supabase.from('expense_categories').select('*').order('name'),
    supabase.from('expenses').select('id, amount, category_id, paid_to, description, created_at, expense_categories(name)').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false }),
    supabase.rpc('get_full_profit_loss', { from_date: from, to_date: to }),
    supabase.rpc('get_cash_flow', { from_date: from, to_date: to }),
    supabase.rpc('get_all_customer_dues'),
  ]);

  const expenseCategories = (expenseCatRes.data ?? []) as any[];
  const expenses = (expenseRes.data ?? []) as any[];
  const profitLoss = (plRes.data ?? []) as { category: string; amount: number }[];
  const cashFlow = (cashFlowRes.data ?? []) as { metric: string; amount: number }[];
  const customerDue = customerDueRes.data ?? 0;

  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

  const plSummary = {
    revenue: profitLoss.find((r: any) => r.category === 'Revenue')?.amount ?? 0,
    cogs: Math.abs(profitLoss.find((r: any) => r.category === 'COGS')?.amount ?? 0),
    grossProfit: profitLoss.find((r: any) => r.category === 'Gross Profit')?.amount ?? 0,
    shippingCost: Math.abs(profitLoss.find((r: any) => r.category === 'Shipping Cost')?.amount ?? 0),
    discounts: Math.abs(profitLoss.find((r: any) => r.category === 'Discounts Given')?.amount ?? 0),
    refunds: Math.abs(profitLoss.find((r: any) => r.category === 'Refunds')?.amount ?? 0),
    gatewayFees: Math.abs(profitLoss.find((r: any) => r.category === 'Payment Gateway Fees')?.amount ?? 0),
    operatingExpenses: Math.abs(profitLoss.find((r: any) => r.category === 'Operating Expenses')?.amount ?? 0),
    netProfit: profitLoss.find((r: any) => r.category === 'Net Profit')?.amount ?? 0,
  };

  const cashFlowSummary = {
    inflow: cashFlow.find((c: any) => c.metric === 'inflow')?.amount ?? 0,
    outflow: cashFlow.find((c: any) => c.metric === 'outflow')?.amount ?? 0,
    netFlow: cashFlow.find((c: any) => c.metric === 'net_flow')?.amount ?? 0,
  };

  const unpaidQuery = await supabase
    .from('orders')
    .select('customer_id, total, order_number, profiles!inner(full_name)')
    .in('status', ['pending', 'processing', 'shipped', 'delivered', 'completed'])
    .not('payment_status', 'eq', 'paid')
    .limit(20);

  return {
    expenseCategories,
    expenses,
    profitLoss: plSummary,
    cashFlow: cashFlowSummary,
    customerDue: Number(customerDue),
    totalExpenses,
    unpaidOrders: ((unpaidQuery as any)?.data ?? []) as any[],
  };
}

export async function createExpense(data: {
  category_id: string;
  amount: number;
  paid_to?: string;
  description?: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'No session' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('accounts.edit');
  } catch {
    return { error: 'Permission denied' };
  }

  const { error } = await supabase.from('expenses').insert({
    category_id: data.category_id,
    amount: data.amount,
    paid_to: data.paid_to?.trim() || null,
    description: data.description?.trim() || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteExpense(id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { error: 'No session' };

    const { requirePermission } = await import('./security');
    try {
      await requirePermission('accounts.delete');
    } catch {
      return { error: 'Permission denied' };
    }

    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return { error: error.message };
    return { success: true };
  } catch (e: any) {
    return { error: e?.message || 'Failed to delete expense' };
  }
}

export async function getSystemTransactions(limit = 200) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('accounts.view');
  } catch {
    return [];
  }

  const { data } = await supabase
    .from('system_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as any[];
}

export async function logSystemTransaction(data: {
  type: 'income' | 'expense' | 'refund' | 'cancellation' | 'adjustment';
  reference_id?: string;
  reference_type?: string;
  description?: string;
  amount: number;
  status?: 'completed' | 'pending' | 'reversed';
  metadata?: Record<string, any>;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  try {
    await supabase.from('system_transactions').insert({
      type: data.type,
      reference_id: data.reference_id || null,
      reference_type: data.reference_type || null,
      description: data.description || null,
      amount: data.amount,
      status: data.status || 'completed',
      metadata: data.metadata || {},
    });
  } catch {}
}

export async function updateOrderShipping(orderId: string, data: {
  courier_name?: string;
  tracking_number?: string;
  actual_courier_cost?: number;
  dispatch_date?: string;
  shipping_status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'No session' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('orders.edit');
  } catch {
    return { error: 'Permission denied' };
  }

  const updateData: Record<string, any> = {};
  if (data.courier_name !== undefined) updateData.courier_name = data.courier_name;
  if (data.tracking_number !== undefined) updateData.tracking_number = data.tracking_number;
  if (data.actual_courier_cost !== undefined) updateData.actual_courier_cost = data.actual_courier_cost;
  if (data.dispatch_date !== undefined) updateData.dispatch_date = data.dispatch_date;
  if (data.shipping_status !== undefined) updateData.shipping_status = data.shipping_status;

  const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
  if (error) return { error: error.message };
  return { success: true };
}
