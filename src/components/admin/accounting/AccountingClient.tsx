'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DollarSign, Receipt, FileText, Plus, X,
  ArrowUpRight, ArrowDownRight,
  Search, RotateCw, Trash2,
} from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  getAccountingDashboardData, createExpense,
  deleteExpense, getSystemTransactions,
} from '@/lib/actions/accounting';

type Tab = 'dashboard' | 'expenses' | 'transactions';

type AcctData = {
  expenseCategories: any[];
  expenses: any[];
  profitLoss: Record<string, number>;
  cashFlow: Record<string, number>;
  customerDue: number;
  totalExpenses: number;
  unpaidOrders: any[];
};

const TYPE_COLORS: Record<string, string> = {
  income: 'bg-emerald-50 text-emerald-600',
  expense: 'bg-red-50 text-red-500',
  refund: 'bg-amber-50 text-amber-600',
  cancellation: 'bg-slate-100 text-slate-500',
  adjustment: 'bg-blue-50 text-blue-600',
};

export function AccountingClient({ initialData }: { initialData: AcctData | null }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'dashboard';
  const validTabs: Tab[] = ['dashboard', 'expenses', 'transactions'];
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab) ? initialTab : 'dashboard');
  const [data, setData] = useState<AcctData | null>(initialData);
  const [loading, setLoading] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getAccountingDashboardData();
    if (result) setData(result as any);
    setLoading(false);
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    const txs = await getSystemTransactions(500);
    setTransactions(txs);
    setTxLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'transactions' && transactions.length === 0) {
      loadTransactions();
    }
  }, [tab, transactions.length, loadTransactions]);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading accounting data...</div>;
  }

  const { profitLoss, cashFlow, expenses, expenseCategories, customerDue, unpaidOrders } = data;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: DollarSign },
    { key: 'expenses', label: 'Expenses', icon: Receipt },
    { key: 'transactions', label: 'Transactions', icon: FileText },
  ];

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category_id: '', amount: '' });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const handleAddExpense = async () => {
    if (!expenseForm.category_id || !expenseForm.amount) {
      setFormError('Please select a category and enter an amount.');
      return;
    }
    setFormError('');
    setFormSaving(true);
    try {
      const result = await createExpense({
        category_id: expenseForm.category_id,
        amount: Number(expenseForm.amount),
      });
      if (result.error) {
        setFormError(result.error);
      } else {
        setShowAddExpense(false);
        setExpenseForm({ category_id: '', amount: '' });
        toast.success('Expense added');
        await refresh();
      }
    } catch (e: any) {
      setFormError(e?.message || 'Something went wrong');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const result = await deleteExpense(id);
    if (result?.error) { toast.error(result.error); return; }
    toast.success('Expense deleted');
    await refresh();
  };

  const kpiCards = [
    { label: 'Revenue', value: profitLoss.revenue, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Gross Profit', value: profitLoss.grossProfit, color: profitLoss.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500', bg: 'bg-emerald-50' },
    { label: 'Net Profit', value: profitLoss.netProfit, color: profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500', bg: profitLoss.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
    { label: 'Total Expenses', value: profitLoss.operatingExpenses, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Cash Inflow', value: cashFlow.inflow, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cash Outflow', value: cashFlow.outflow, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Customer Due', value: customerDue, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'COGS', value: profitLoss.cogs, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const filteredTransactions = transactions.filter((tx: any) => {
    if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      return (
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.reference_id || '').toLowerCase().includes(q) ||
        (tx.reference_type || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounting</h1>
          <p className="text-slate-500 mt-1 text-sm">Enterprise financial management system</p>
        </div>
        <button onClick={refresh} disabled={loading} className="px-5 py-2.5 bg-[#1a4731] text-white rounded-xl text-sm font-bold hover:bg-[#2d6a4f] transition-all disabled:opacity-50">
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all',
                isActive ? 'bg-white text-[#1a4731] border-b-2 border-[#1a4731]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ============================== */}
      {/* DASHBOARD TAB */}
      {/* ============================== */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-[1.75rem] border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{kpi.label}</span>
                </div>
                <p className={cn('text-2xl font-black tracking-tight', kpi.color)}>
                  {kpi.label === 'Customer Due' ? formatPrice(kpi.value) : formatPrice(Math.abs(kpi.value))}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[1.75rem] border border-slate-100 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Profit & Loss Statement</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Revenue</span>
                <span className="text-sm font-bold text-emerald-600">{formatPrice(profitLoss.revenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Cost of Goods Sold (COGS)</span>
                <span className="text-sm font-bold text-red-500">-{formatPrice(profitLoss.cogs)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50 font-bold">
                <span className="text-sm text-slate-800">Gross Profit</span>
                <span className={cn('text-sm', profitLoss.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatPrice(profitLoss.grossProfit)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Shipping Cost (Actual)</span>
                <span className="text-sm font-bold text-orange-500">-{formatPrice(profitLoss.shippingCost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Discounts Given</span>
                <span className="text-sm font-bold text-amber-500">-{formatPrice(profitLoss.discounts)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Refunds</span>
                <span className="text-sm font-bold text-rose-500">-{formatPrice(profitLoss.refunds)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Payment Gateway Fees</span>
                <span className="text-sm font-bold text-purple-500">-{formatPrice(profitLoss.gatewayFees)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-600">Operating Expenses</span>
                <span className="text-sm font-bold text-rose-500">-{formatPrice(profitLoss.operatingExpenses)}</span>
              </div>
              <div className="flex justify-between py-3 text-base font-black">
                <span className="text-slate-900">Net Profit</span>
                <span className={cn(profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {formatPrice(profitLoss.netProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-[1.75rem] border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Cash Flow</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Inflow</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatPrice(cashFlow.inflow)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">Outflow</span>
                  </div>
                  <span className="text-sm font-bold text-red-500">{formatPrice(cashFlow.outflow)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-bold text-slate-800">Net Flow</span>
                  <span className={cn('text-sm font-bold', cashFlow.netFlow >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {formatPrice(cashFlow.netFlow)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[1.75rem] border border-slate-100 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">Customer Due Collection</h3>
              <p className="text-3xl font-black text-orange-600 mb-4">{formatPrice(customerDue)}</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {unpaidOrders.length > 0 ? unpaidOrders.slice(0, 10).map((o: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-600">#{String(o.order_number ?? o.customer_id).slice(0, 8)}</span>
                    <span className="text-slate-600">{o.profiles?.full_name ?? 'Unknown'}</span>
                    <span className="font-bold text-slate-800">{formatPrice(Number(o.total ?? 0))}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400">No unpaid orders</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* EXPENSES TAB */}
      {/* ============================== */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{expenses.length} total expenses</p>
            <button onClick={() => setShowAddExpense(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a4731] text-white rounded-xl text-sm font-bold hover:bg-[#2d6a4f] transition-all">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>

          {showAddExpense && (
            <div className="bg-slate-50 rounded-[1.75rem] p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">New Expense</h3>
                <button onClick={() => { setShowAddExpense(false); setFormError(''); }}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              {formError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{formError}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select value={expenseForm.category_id} onChange={(e) => setExpenseForm(f => ({ ...f, category_id: e.target.value }))}
                  className="h-12 px-4 rounded-xl border border-slate-200 text-sm bg-white">
                  <option value="">Select Category</option>
                  {expenseCategories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="number" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  className="h-12 px-4 rounded-xl border border-slate-200 text-sm" />
              </div>
              <button onClick={handleAddExpense} disabled={formSaving} className="px-6 py-3 bg-[#1a4731] text-white rounded-xl text-sm font-bold hover:bg-[#2d6a4f] disabled:opacity-50">
                {formSaving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          )}

          <div className="bg-white rounded-[1.75rem] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.length > 0 ? expenses.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-700">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{e.expense_categories?.name ?? 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatPrice(Number(e.amount ?? 0))}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">No expenses recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* TRANSACTIONS TAB (Read-Only System Log) */}
      {/* ============================== */}
      {tab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-500">{filteredTransactions.length} system transactions</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="pl-9 pr-4 h-10 rounded-xl border border-slate-200 text-sm w-56"
                />
              </div>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="refund">Refund</option>
                <option value="cancellation">Cancellation</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <button onClick={loadTransactions} disabled={txLoading} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50">
                <RotateCw className={cn('w-4 h-4 text-slate-500', txLoading && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[1.75rem] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                    <th className="px-6 py-4">Date &amp; Time</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.length > 0 ? filteredTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="ml-2 text-slate-400">
                          {new Date(tx.created_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full uppercase', TYPE_COLORS[tx.type] || 'bg-slate-100 text-slate-500')}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {tx.reference_type && (
                          <span className="text-slate-400 uppercase">{tx.reference_type}</span>
                        )}
                        {tx.reference_id && (
                          <span className="ml-1 text-slate-600">{tx.reference_id.slice(0, 8)}</span>
                        )}
                        {!tx.reference_type && !tx.reference_id && <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[280px] truncate">{tx.description || '-'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-right whitespace-nowrap">
                        <span className={tx.type === 'income' ? 'text-emerald-600' : tx.type === 'refund' || tx.type === 'cancellation' ? 'text-amber-600' : 'text-red-500'}>
                          {tx.type === 'income' ? '+' : '-'}{formatPrice(Number(tx.amount ?? 0))}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                        {txLoading ? 'Loading transactions...' : 'No transactions recorded yet. Transactions are created automatically when financial events occur.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
