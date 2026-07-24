'use client';

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Save, X, Ticket, Search, CheckCircle, XCircle,
  Copy, ChevronDown, ArrowUpDown, Filter, AlertTriangle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
  duplicateCoupon,
  type CouponData,
  type CouponRow,
} from '@/lib/actions/coupons';

// ─── Empty Form State ────────────────────────────────────────────────────────

const emptyForm: CouponData = {
  code: '',
  name: '',
  type: 'percent',
  value: 0,
  description: '',
  min_order: 0,
  max_discount: 0,
  max_uses: 0,
  per_user_limit: 1,
  starts_at: '',
  expires_at: '',
  first_order_only: false,
  new_customer_only: false,
  applicable_products: [],
  applicable_categories: [],
  excluded_products: [],
  excluded_categories: [],
  is_active: true,
};

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', danger ? 'bg-red-50' : 'bg-amber-50')}>
            <AlertTriangle className={cn('w-5 h-5', danger ? 'text-red-500' : 'text-amber-500')} />
          </div>
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={onConfirm}
            className={danger ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CouponManager({ initialCoupons }: { initialCoupons: CouponRow[] }) {
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at_desc');
  const [formData, setFormData] = useState<CouponData>({ ...emptyForm });
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  // Text input states for comma-separated fields
  const [applicableProductsText, setApplicableProductsText] = useState('');
  const [applicableCategoriesText, setApplicableCategoriesText] = useState('');
  const [excludedProductsText, setExcludedProductsText] = useState('');
  const [excludedCategoriesText, setExcludedCategoriesText] = useState('');

  // Refresh coupons from server
  const refreshCoupons = async () => {
    try {
      const data = await getCoupons();
      setCoupons(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh coupons');
    }
  };

  // ─── Filtered & Sorted List ──────────────────────────────────────────────

  const filteredCoupons = useMemo(() => {
    let list = [...coupons];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          String(c.value).includes(q)
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      list = list.filter((c) => c.type === filterType);
    }

    // Filter by status
    if (filterStatus === 'active') {
      list = list.filter((c) => c.is_active);
    } else if (filterStatus === 'inactive') {
      list = list.filter((c) => !c.is_active);
    } else if (filterStatus === 'expired') {
      list = list.filter((c) => c.expires_at && new Date(c.expires_at) < new Date());
    } else if (filterStatus === 'limited') {
      list = list.filter((c) => c.max_uses !== null && c.used_count >= c.max_uses);
    }

    // Sort
    switch (sortBy) {
      case 'code_asc':
        list.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case 'code_desc':
        list.sort((a, b) => b.code.localeCompare(a.code));
        break;
      case 'value_desc':
        list.sort((a, b) => b.value - a.value);
        break;
      case 'value_asc':
        list.sort((a, b) => a.value - b.value);
        break;
      case 'used_desc':
        list.sort((a, b) => b.used_count - a.used_count);
        break;
      case 'created_at_asc':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'created_at_desc':
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return list;
  }, [coupons, searchQuery, filterType, filterStatus, sortBy]);

  // ─── Form Helpers ────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingId(null);
    setIsAdding(true);
    setFormData({ ...emptyForm });
    setApplicableProductsText('');
    setApplicableCategoriesText('');
    setExcludedProductsText('');
    setExcludedCategoriesText('');
  };

  const handleEdit = (cpn: CouponRow) => {
    setEditingId(cpn.id);
    setIsAdding(false);
    setFormData({
      code: cpn.code,
      name: (cpn as any).name || '',
      type: (cpn.type as any) || 'percent',
      value: Number(cpn.value),
      description: cpn.description || '',
      min_order: Number(cpn.min_order || 0),
      max_discount: cpn.max_discount != null ? Number(cpn.max_discount) : 0,
      max_uses: cpn.max_uses != null ? Number(cpn.max_uses) : 0,
      per_user_limit: Number(cpn.per_user_limit || 1),
      starts_at: cpn.starts_at ? new Date(cpn.starts_at).toISOString().split('T')[0] : '',
      expires_at: cpn.expires_at ? new Date(cpn.expires_at).toISOString().split('T')[0] : '',
      first_order_only: !!cpn.first_order_only,
      new_customer_only: !!cpn.new_customer_only,
      applicable_products: cpn.applicable_products || [],
      applicable_categories: cpn.applicable_categories || [],
      excluded_products: cpn.excluded_products || [],
      excluded_categories: cpn.excluded_categories || [],
      is_active: cpn.is_active,
    });
    setApplicableProductsText((cpn.applicable_products || []).join(', '));
    setApplicableCategoriesText((cpn.applicable_categories || []).join(', '));
    setExcludedProductsText((cpn.excluded_products || []).join(', '));
    setExcludedCategoriesText((cpn.excluded_categories || []).join(', '));
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ ...emptyForm });
    setApplicableProductsText('');
    setApplicableCategoriesText('');
    setExcludedProductsText('');
    setExcludedCategoriesText('');
  };

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (formData.type !== 'free_shipping' && formData.value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (formData.type === 'percent' && formData.value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave: CouponData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        name: formData.name || null,
        applicable_products: applicableProductsText
          ? applicableProductsText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        applicable_categories: applicableCategoriesText
          ? applicableCategoriesText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        excluded_products: excludedProductsText
          ? excludedProductsText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        excluded_categories: excludedCategoriesText
          ? excludedCategoriesText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        max_discount: formData.max_discount && formData.max_discount > 0 ? formData.max_discount : null,
        max_uses: formData.max_uses && formData.max_uses > 0 ? formData.max_uses : null,
      };

      if (editingId) {
        await updateCoupon(editingId, dataToSave);
        toast.success('Coupon updated successfully');
      } else {
        await createCoupon(dataToSave);
        toast.success('Coupon created successfully');
      }

      await refreshCoupons();
      handleCancel();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = (id: string, code: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Coupon',
      message: `Are you sure you want to permanently delete coupon "${code}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        try {
          await deleteCoupon(id);
          setCoupons((prev) => prev.filter((c) => c.id !== id));
          toast.success('Coupon deleted');
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete coupon');
        }
      },
    });
  };

  // ─── Toggle Active ───────────────────────────────────────────────────────

  const handleToggle = async (cpn: CouponRow) => {
    const newStatus = !cpn.is_active;
    try {
      await toggleCouponActive(cpn.id, newStatus);
      setCoupons((prev) => prev.map((c) => (c.id === cpn.id ? { ...c, is_active: newStatus } : c)));
      toast.success(newStatus ? 'Coupon activated' : 'Coupon deactivated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle coupon');
    }
  };

  // ─── Duplicate ───────────────────────────────────────────────────────────

  const handleDuplicate = async (cpn: CouponRow) => {
    try {
      const newCoupon = await duplicateCoupon(cpn.id);
      setCoupons((prev) => [newCoupon, ...prev]);
      toast.success(`Coupon duplicated as "${newCoupon.code}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate coupon');
    }
  };

  // ─── Copy Code ───────────────────────────────────────────────────────────

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied');
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isExpired = (cpn: CouponRow) => cpn.expires_at && new Date(cpn.expires_at) < new Date();
  const isAtLimit = (cpn: CouponRow) => cpn.max_uses !== null && cpn.used_count >= cpn.max_uses;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toolbar: Search + Filters + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition-all"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]"
        >
          <option value="all">All Types</option>
          <option value="percent">Percentage</option>
          <option value="fixed">Fixed Amount</option>
          <option value="free_shipping">Free Shipping</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
          <option value="limited">Usage Limit Reached</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]"
        >
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
          <option value="code_asc">Code A-Z</option>
          <option value="code_desc">Code Z-A</option>
          <option value="value_desc">Highest Value</option>
          <option value="value_asc">Lowest Value</option>
          <option value="used_desc">Most Used</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Coupons ({filteredCoupons.length})</CardTitle>
              <Button size="sm" onClick={openCreateForm} disabled={isAdding || !!editingId}>
                <Plus size={16} className="mr-2" /> Create Coupon
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredCoupons.length === 0 && (
                  <div className="p-10 text-center text-slate-400">
                    {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                      ? 'No coupons match your filters.'
                      : 'No coupons found. Create your first coupon!'}
                  </div>
                )}
                {filteredCoupons.map((cpn) => (
                  <div key={cpn.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        cpn.type === 'free_shipping' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'
                      )}>
                        <Ticket size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{cpn.code}</span>
                          <button onClick={() => copyCode(cpn.code)} className="text-slate-300 hover:text-slate-500 transition-colors">
                            <Copy size={12} />
                          </button>
                          {isExpired(cpn) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">Expired</span>
                          )}
                          {isAtLimit(cpn) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">Limit Reached</span>
                          )}
                        </div>
                        {cpn.description && (
                          <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{cpn.description}</div>
                        )}
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">
                            {cpn.type === 'percent' && `${cpn.value}% OFF`}
                            {cpn.type === 'fixed' && `৳${Number(cpn.value).toLocaleString()} OFF`}
                            {cpn.type === 'free_shipping' && 'Free Shipping'}
                          </span>
                          {cpn.min_order > 0 && <span> · Min: ৳{Number(cpn.min_order).toLocaleString()}</span>}
                          {cpn.max_discount != null && cpn.max_discount > 0 && <span> · Max: ৳{Number(cpn.max_discount).toLocaleString()}</span>}
                          {cpn.expires_at && <span> · Until {formatDate(cpn.expires_at)}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400">
                            Used: {cpn.used_count || 0}{cpn.max_uses ? `/${cpn.max_uses}` : ' ∞'}
                          </span>
                          {cpn.first_order_only && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">First Order</span>
                          )}
                          {cpn.new_customer_only && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">New Customer</span>
                          )}
                          {cpn.per_user_limit > 1 && (
                            <span className="text-[10px] text-slate-400">Limit: {cpn.per_user_limit}/user</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleToggle(cpn)} className="flex items-center gap-1">
                        {cpn.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                            <XCircle className="h-3 w-3" /> Off
                          </span>
                        )}
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(cpn)} title="Duplicate">
                        <Copy size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cpn)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cpn.id, cpn.code)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Panel */}
        <div>
          {(isAdding || editingId) ? (
            <Card className="border-none shadow-sm sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg font-bold">{editingId ? 'Edit Coupon' : 'New Coupon'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
                {/* Code */}
                <div className="space-y-2">
                  <Label>Coupon Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER25"
                  />
                </div>

                {/* Type + Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed (BDT)</option>
                      <option value="free_shipping">Free Shipping</option>
                    </select>
                  </div>
                  {formData.type !== 'free_shipping' && (
                    <div className="space-y-2">
                      <Label>Value *</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description <span className="text-slate-400 font-normal">(internal note)</span></Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Summer sale discount"
                  />
                </div>

                {/* Max Discount */}
                {formData.type === 'percent' && (
                  <div className="space-y-2">
                    <Label>Max Discount Amount (BDT) <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.max_discount || ''}
                      onChange={(e) => setFormData({ ...formData, max_discount: parseFloat(e.target.value) || 0 })}
                      placeholder="No limit"
                    />
                  </div>
                )}

                {/* Min Order */}
                <div className="space-y-2">
                  <Label>Min Order Amount (BDT)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.min_order}
                    onChange={(e) => setFormData({ ...formData, min_order: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.starts_at || ''}
                      onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.expires_at || ''}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses <span className="text-slate-400 font-normal">(0 = unlimited)</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.max_uses || ''}
                      onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per User Limit</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.per_user_limit}
                      onChange={(e) => setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="first_order_only"
                      checked={formData.first_order_only}
                      onChange={(e) => setFormData({ ...formData, first_order_only: e.target.checked })}
                      className="accent-[#1B4332]"
                    />
                    <Label htmlFor="first_order_only">First Order Only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new_customer_only"
                      checked={formData.new_customer_only}
                      onChange={(e) => setFormData({ ...formData, new_customer_only: e.target.checked })}
                      className="accent-[#1B4332]"
                    />
                    <Label htmlFor="new_customer_only">New Customer Only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cpn_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="accent-[#1B4332]"
                    />
                    <Label htmlFor="cpn_active">Active</Label>
                  </div>
                </div>

                {/* Applicable Categories */}
                <div className="space-y-2">
                  <Label>Applicable Categories <span className="text-slate-400 font-normal">(comma-separated, blank = all)</span></Label>
                  <Input
                    value={applicableCategoriesText}
                    onChange={(e) => setApplicableCategoriesText(e.target.value)}
                    placeholder="e.g. T-Shirts, Hoodies"
                  />
                </div>

                {/* Applicable Products */}
                <div className="space-y-2">
                  <Label>Applicable Products <span className="text-slate-400 font-normal">(comma-separated, blank = all)</span></Label>
                  <Input
                    value={applicableProductsText}
                    onChange={(e) => setApplicableProductsText(e.target.value)}
                    placeholder="e.g. product-slug-1, product-slug-2"
                  />
                </div>

                {/* Excluded Categories */}
                <div className="space-y-2">
                  <Label>Excluded Categories <span className="text-slate-400 font-normal">(comma-separated)</span></Label>
                  <Input
                    value={excludedCategoriesText}
                    onChange={(e) => setExcludedCategoriesText(e.target.value)}
                    placeholder="e.g. Sale Items"
                  />
                </div>

                {/* Excluded Products */}
                <div className="space-y-2">
                  <Label>Excluded Products <span className="text-slate-400 font-normal">(comma-separated)</span></Label>
                  <Input
                    value={excludedProductsText}
                    onChange={(e) => setExcludedProductsText(e.target.value)}
                    placeholder="e.g. product-slug-3"
                  />
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-2">
                  <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                    {isLoading ? 'Saving...' : editingId ? 'Update Coupon' : 'Create Coupon'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-slate-50 border border-dashed rounded-3xl p-10 text-center space-y-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Plus size={24} />
              </div>
              <p className="text-sm text-slate-500">Select a coupon to edit or click &ldquo;Create Coupon&rdquo; to start.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
