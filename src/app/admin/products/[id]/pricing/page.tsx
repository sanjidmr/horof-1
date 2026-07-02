'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Edit3, 
  Check, 
  X, 
  Percent, 
  Layers, 
  Settings, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/shadcn/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shadcn/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';
import { Switch } from '@/components/shadcn/switch';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

import { 
  getProductPricingData, 
  upsertQuantityDiscount, 
  deleteQuantityDiscount, 
  upsertConfigOption, 
  deleteConfigOption,
  type QuantityDiscount, 
  type ProductConfigOption 
} from '@/lib/actions/pricing';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminPricingPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  
  const [product, setProduct] = useState<{ id: number; name: string; price: number } | null>(null);
  const [discounts, setDiscounts] = useState<QuantityDiscount[]>([]);
  const [options, setOptions] = useState<ProductConfigOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Discount form state
  const [discountQty, setDiscountQty] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);

  // Variant Option form state
  const [optionType, setOptionType] = useState<ProductConfigOption['type']>('size');
  const [optionName, setOptionName] = useState<string>('');
  const [optionPrice, setOptionPrice] = useState<string>('');
  const [optionActive, setOptionActive] = useState<boolean>(true);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Fetch product basic info
      const { data: prod, error } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', id)
        .single();
      
      if (error || !prod) {
        toast.error('Failed to load product details');
        router.push('/admin/products');
        return;
      }

      setProduct(prod);

      // Fetch pricing details
      try {
        const data = await getProductPricingData(Number(id));
        if (data) {
          setDiscounts(data.discounts);
          setOptions(data.configOptions);
        }
      } catch (err) {
        console.error('Error loading configurations', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, supabase, router]);

  // Handle quantity discount CRUD
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const qty = parseInt(discountQty);
    const pct = parseFloat(discountPercent);

    if (isNaN(qty) || qty < 1) {
      toast.error('Quantity must be a positive integer');
      return;
    }

    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Discount percent must be between 0 and 100');
      return;
    }

    try {
      const saved = await upsertQuantityDiscount({
        id: editingDiscountId || undefined,
        product_id: product.id,
        quantity: qty,
        discount_percent: pct
      });

      if (editingDiscountId) {
        setDiscounts(discounts.map(d => d.id === editingDiscountId ? saved : d));
        toast.success('Discount rule updated');
      } else {
        setDiscounts([...discounts.filter(d => d.quantity !== qty), saved].sort((a, b) => a.quantity - b.quantity));
        toast.success('Discount rule added');
      }

      // Reset form
      setDiscountQty('');
      setDiscountPercent('');
      setEditingDiscountId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save discount rule');
    }
  };

  const handleEditDiscount = (d: QuantityDiscount) => {
    setEditingDiscountId(d.id);
    setDiscountQty(d.quantity.toString());
    setDiscountPercent(d.discount_percent.toString());
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!product) return;
    if (!confirm('Are you sure you want to delete this discount rule?')) return;

    try {
      await deleteQuantityDiscount(discountId, product.id);
      setDiscounts(discounts.filter(d => d.id !== discountId));
      toast.success('Discount rule deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete discount rule');
    }
  };

  // Handle variant option CRUD
  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!optionName.trim()) {
      toast.error('Option name is required');
      return;
    }

    const priceMod = parseFloat(optionPrice);
    if (isNaN(priceMod)) {
      toast.error('Price modifier must be a valid number');
      return;
    }

    try {
      const saved = await upsertConfigOption({
        id: editingOptionId || undefined,
        product_id: product.id,
        type: optionType,
        name: optionName,
        price_modifier: priceMod,
        is_active: optionActive
      });

      if (editingOptionId) {
        setOptions(options.map(o => o.id === editingOptionId ? saved : o));
        toast.success('Option updated');
      } else {
        setOptions([...options, saved]);
        toast.success('Option added');
      }

      // Reset form
      setOptionName('');
      setOptionPrice('');
      setOptionActive(true);
      setEditingOptionId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save option');
    }
  };

  const handleEditOption = (opt: ProductConfigOption) => {
    setEditingOptionId(opt.id);
    setOptionType(opt.type);
    setOptionName(opt.name);
    setOptionPrice(opt.price_modifier.toString());
    setOptionActive(opt.is_active);
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!product) return;
    if (!confirm('Are you sure you want to delete this option?')) return;

    try {
      await deleteConfigOption(optionId, product.id);
      setOptions(options.filter(o => o.id !== optionId));
      toast.success('Option deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete option');
    }
  };

  const handleToggleOptionStatus = async (opt: ProductConfigOption) => {
    try {
      const updated = await upsertConfigOption({
        ...opt,
        is_active: !opt.is_active
      });
      setOptions(options.map(o => o.id === opt.id ? updated : o));
      toast.success(`${opt.name} is now ${!opt.is_active ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-y-4 flex-col">
        <div className="h-10 w-10 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1B4332] font-semibold text-sm">Loading pricing dashboard...</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back to Products */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" className="h-9 w-9 p-0 hover:bg-slate-100 rounded-full">
          <Link href="/admin/products">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Pricing & Spec Configurations
          </h1>
          <p className="text-sm text-slate-500">
            Set custom variants and bulk discounts for <span className="font-bold text-[#1B4332]">{product.name}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Discount Rules Management */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-600" />
                Discount Management
              </CardTitle>
              <CardDescription>
                Define tiered quantity discount percentages.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Discount form */}
              <form onSubmit={handleSaveDiscount} className="space-y-4 bg-slate-50/40 border border-slate-100 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {editingDiscountId ? 'Edit Discount Tier' : 'Add New Tier'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Min Quantity</label>
                    <input 
                      type="number"
                      placeholder="e.g. 3"
                      value={discountQty}
                      onChange={e => setDiscountQty(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-[#1B4332] outline-none bg-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Discount (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5"
                      value={discountPercent}
                      onChange={e => setDiscountPercent(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-[#1B4332] outline-none bg-white font-bold"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white flex-1 font-bold text-xs h-9">
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {editingDiscountId ? 'Update Rule' : 'Save Rule'}
                  </Button>
                  {editingDiscountId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingDiscountId(null);
                        setDiscountQty('');
                        setDiscountPercent('');
                      }}
                      className="h-9 px-3 text-slate-500"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              {/* Discount list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Active Discount Tiers
                </h4>
                {discounts.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No discount tiers configured yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {discounts.map((d) => (
                      <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Buy <span className="text-[#1B4332]">{d.quantity}+</span> Pieces
                          </p>
                          <p className="text-xs text-emerald-600 font-extrabold">
                            Save {d.discount_percent}%
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditDiscount(d)}
                            className="h-7 w-7 text-slate-400 hover:text-[#2D6A4F] hover:bg-slate-100 rounded"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteDiscount(d.id)}
                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Variant Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#1B4332]" />
                Variant Management
              </CardTitle>
              <CardDescription>
                Configure additional pricing modifiers and option states.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="size" className="w-full">
                <TabsList className="grid grid-cols-4 bg-slate-100/60 rounded-xl p-1 mb-6">
                  <TabsTrigger value="size" onClick={() => setOptionType('size')} className="rounded-lg text-xs font-bold py-2">Sizes</TabsTrigger>
                  <TabsTrigger value="acrylic_color" onClick={() => setOptionType('acrylic_color')} className="rounded-lg text-xs font-bold py-2">Acrylic</TabsTrigger>
                  <TabsTrigger value="letter_color" onClick={() => setOptionType('letter_color')} className="rounded-lg text-xs font-bold py-2">Letters</TabsTrigger>
                  <TabsTrigger value="lighting" onClick={() => setOptionType('lighting')} className="rounded-lg text-xs font-bold py-2">Lighting</TabsTrigger>
                </TabsList>

                {/* Shared Option Addition Form */}
                <form onSubmit={handleSaveOption} className="space-y-4 bg-slate-50/40 border border-slate-100 rounded-xl p-4 mb-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {editingOptionId ? 'Edit Configuration Option' : `Add New Option`}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Option Name</label>
                      <input 
                        type="text"
                        placeholder={
                          optionType === 'size' ? 'e.g. 18 Inches' :
                          optionType === 'acrylic_color' ? 'e.g. Transparent' :
                          optionType === 'letter_color' ? 'e.g. Mirror Gold' :
                          'e.g. LED Module'
                        }
                        value={optionName}
                        onChange={e => setOptionName(e.target.value)}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-[#1B4332] outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Price Modifier (+৳)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 500"
                        value={optionPrice}
                        onChange={e => setOptionPrice(e.target.value)}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-[#1B4332] outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-3 md:pt-6">
                      <Switch 
                        checked={optionActive} 
                        onCheckedChange={setOptionActive} 
                      />
                      <label className="text-xs font-bold text-slate-600 uppercase">Active Status</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs h-9">
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {editingOptionId ? 'Update Option' : 'Save Option'}
                    </Button>
                    {editingOptionId && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingOptionId(null);
                          setOptionName('');
                          setOptionPrice('');
                          setOptionActive(true);
                        }}
                        className="h-9 px-3 text-slate-500"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>

                {/* Option tables per tab */}
                {['size', 'acrylic_color', 'letter_color', 'lighting'].map((tabVal) => (
                  <TabsContent key={tabVal} value={tabVal} className="focus:outline-none">
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                            <th className="px-4 py-3">Option Name</th>
                            <th className="px-4 py-3">Price Modifier</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {options.filter(o => o.type === tabVal).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                                No {tabVal.replace('_', ' ')} options added yet.
                              </td>
                            </tr>
                          ) : (
                            options.filter(o => o.type === tabVal).map((opt) => (
                              <tr key={opt.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-4 py-3 text-sm font-bold text-slate-800">
                                  {opt.name}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-700">
                                  +{formatPrice(opt.price_modifier)}
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => handleToggleOptionStatus(opt)}>
                                    {opt.is_active ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                        Inactive
                                      </span>
                                    )}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleEditOption(opt)}
                                      className="h-7 w-7 text-slate-400 hover:text-[#2D6A4F] hover:bg-slate-100 rounded"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleDeleteOption(opt.id)}
                                      className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
