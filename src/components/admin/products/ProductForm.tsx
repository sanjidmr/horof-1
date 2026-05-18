'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X, Image as ImageIcon, Settings, Tag, DollarSign, Layers, Sparkles, FileText, Globe, CheckCircle, Package } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { saveProduct, type SaveProductResult } from '@/lib/actions/save-product';
import {
  productFormSchema,
  PRODUCT_SECTIONS,
  specificationToRows,
  type ProductFormValues,
} from '@/lib/validation/product-form';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { cn } from '@/lib/utils';

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractStoragePath(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = '/object/public/product-images/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type CategoryOption = { id: string; name: string; parent_id: string | null };
export type BrandOption = { id: string; name: string };

export type ProductFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  sku?: string;
  price?: number;
  offer_price?: number | null;
  stock?: number;
  description?: string | null;
  specification?: unknown;
  perfect_for?: string[] | null;
  section?: ProductFormValues['section'];
  flash_sale_ends_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  is_best_selling?: boolean;
  is_new_arrival?: boolean;
  is_product_of_the_day?: boolean;
  images?: { image_url: string }[];
  variants?: { size?: string | null; color?: string | null; stock: number; price_modifier: number }[];
};

type ProductFormProps = {
  mode: 'create' | 'edit';
  categories: CategoryOption[];
  brands: BrandOption[];
  initial?: ProductFormInitial | null;
};

const defaultValuesBase: Partial<ProductFormValues> = {
  name: '',
  slug: '',
  sku: '',
  price: 0,
  offer_price: undefined,
  stock: 0,
  description: '',
  specification: [{ key: '', value: '' }],
  perfect_for_str: '',
  section: 'best_selling',
  flash_sale_ends_at: '',
  meta_title: '',
  meta_description: '',
  category_id: '',
  brand_id: '',
  images: [],
  is_best_selling: false,
  is_new_arrival: false,
  is_product_of_the_day: false,
  variants: [{ size: '', color: '', stock: 0, price_modifier: 0 }],
};

export function ProductForm({ mode, categories, brands, initial }: ProductFormProps) {
  const router = useRouter();
  const slugTouched = useRef(false);
  const [dragActive, setDragActive] = useState(false);

  const defaultValues = useMemo((): ProductFormValues => {
    if (!initial) {
      return { ...defaultValuesBase, id: undefined } as ProductFormValues;
    }
    const imgs =
      initial.images?.map((row) => {
        const url = row.image_url;
        const path = extractStoragePath(url) ?? `legacy:${url.slice(-40)}`;
        return { path, url };
      }) ?? [];

    return {
      ...defaultValuesBase,
      id: initial.id,
      name: initial.name ?? '',
      slug: initial.slug ?? '',
      sku: initial.sku ?? '',
      price: Number(initial.price ?? 0),
      offer_price: initial.offer_price != null ? Number(initial.offer_price) : undefined,
      stock: Number(initial.stock ?? 0),
      description: initial.description ?? '',
      specification: specificationToRows(initial.specification),
      perfect_for_str: Array.isArray(initial.perfect_for)
        ? initial.perfect_for.join(', ')
        : typeof initial.perfect_for === 'string'
        ? initial.perfect_for
        : '',
      section: (initial.section as ProductFormValues['section']) ?? 'best_selling',
      flash_sale_ends_at: isoToDatetimeLocal(initial.flash_sale_ends_at ?? undefined),
      meta_title: initial.meta_title ?? '',
      meta_description: initial.meta_description ?? '',
      category_id: (initial.category_id as '' | (string & {})) ?? '',
      brand_id: (initial.brand_id as '' | (string & {})) ?? '',
      is_best_selling: !!initial.is_best_selling,
      is_new_arrival: !!initial.is_new_arrival,
      is_product_of_the_day: !!initial.is_product_of_the_day,
      images: imgs,
      variants:
        initial.variants && initial.variants.length > 0
          ? initial.variants.map((v) => ({
              size: v.size ?? '',
              color: v.color ?? '',
              stock: Number(v.stock),
              price_modifier: Number(v.price_modifier),
            }))
          : [{ size: '', color: '', stock: 0, price_modifier: 0 }],
    } as ProductFormValues;
  }, [initial]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
    values: defaultValues,
  });

  const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({
    control: form.control,
    name: 'specification',
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const section = form.watch('section');
  const name = form.watch('name');
  const images = form.watch('images') ?? [];

  useEffect(() => {
    if (mode !== 'create') return;
    if (slugTouched.current) return;
    const s = slugify(name || '');
    if (s) form.setValue('slug', s, { shouldValidate: true });
  }, [name, form, mode]);

  const sortedCategories = useMemo(() => {
    const label = (c: CategoryOption) => {
      if (!c.parent_id) return c.name;
      const p = categories.find((x) => x.id === c.parent_id);
      return p ? `${p.name} › ${c.name}` : c.name;
    };
    return [...categories].sort((a, b) => label(a).localeCompare(label(b)));
  }, [categories]);

  const categoryLabel = (c: CategoryOption) => {
    if (!c.parent_id) return c.name;
    const p = categories.find((x) => x.id === c.parent_id);
    return p ? `${p.name} › ${c.name}` : c.name;
  };

  const slugRegister = form.register('slug');

  const uploadFiles = async (files: FileList | File[]) => {
    const sb = createSupabaseBrowserClient();
    if (!sb) {
      toast.error('Supabase is not configured');
      return;
    }
    const list = Array.from(files);
    const current = form.getValues('images') ?? [];
    const room = 3 - current.length;
    if (room <= 0) {
      toast.error('Maximum 3 images');
      return;
    }
    const take = list.slice(0, room);
    for (const file of take) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      const ext = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
      const path = `uploads/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      const next = [...(form.getValues('images') ?? []), { path, url: data.publicUrl }];
      form.setValue('images', next, { shouldValidate: true, shouldDirty: true });
    }
  };

  const removeImage = async (index: number) => {
    const sb = createSupabaseBrowserClient();
    const current = [...(form.getValues('images') ?? [])];
    const [removed] = current.splice(index, 1);
    if (removed && sb && !removed.path.startsWith('legacy:')) {
      const { error } = await sb.storage.from('product-images').remove([removed.path]);
      if (error) toast.error(`Storage: ${error.message}`);
    }
    form.setValue('images', current, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    // Check if we exceed the 4 Product of the Day limit
    if (values.is_product_of_the_day) {
      const sb = createSupabaseBrowserClient();
      if (sb) {
        let query = sb
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('is_product_of_the_day', true);
        
        if (values.id) {
          query = query.neq('id', values.id);
        }

        const { count, error: countErr } = await query;
        if (!countErr && count !== null && count >= 4) {
          toast.error('You can select a maximum of 4 Products of the Day. Please deselect another product first.');
          return;
        }
      }
    }

    const payload: ProductFormValues = {
      ...values,
      slug: values.slug.trim().toLowerCase(),
      flash_sale_ends_at:
        values.section === 'flash_sale' && values.flash_sale_ends_at
          ? new Date(values.flash_sale_ends_at).toISOString()
          : null,
    };

    const res = (await saveProduct(payload)) as SaveProductResult;
    if (res.ok) {
      toast.success(mode === 'create' ? 'Product created' : 'Product updated');
      router.refresh();
      if (mode === 'create') {
        router.push(`/admin/products/${res.id}/edit`);
      }
    } else {
      const err = res as Extract<SaveProductResult, { ok: false }>;
      toast.error(err.message);
      if (err.issues?.length) {
        for (const i of err.issues.slice(0, 5)) {
          const path = i.path.map(String).join('.');
          form.setError(path as never, { message: i.message });
        }
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* Title / Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
            {mode === 'create' ? 'Add New Product' : 'Edit Product'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Design, configure, and release handcrafted masterpieces to your online store.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="px-6 py-2.5 rounded-full border-slate-200 hover:bg-slate-50 font-bold transition-all text-slate-600 h-11"
            onClick={() => router.push('/admin/products')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#1a4731] hover:bg-[#256044] text-white font-bold px-6 py-2.5 rounded-full shadow-lg shadow-forest-900/10 hover:shadow-forest-900/20 hover:-translate-y-0.5 transition-all duration-200 h-11"
          >
            {form.formState.isSubmitting ? 'Saving…' : 'Save product'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column - Main product details */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Card 1: Basic details */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <FileText className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 bg-white">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product name *</Label>
                <Input
                  id="name"
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-medium"
                  placeholder="Enter a premium title for the product"
                  {...form.register('name')}
                />
                {form.formState.errors.name && <p className="text-xs text-red-600 font-medium">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</Label>
                <Textarea
                  rows={6}
                  className="bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-medium p-4"
                  placeholder="Tell a compelling story about this masterpiece..."
                  {...form.register('description')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Media */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <ImageIcon className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Product Images</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 bg-white">
              <div
                className={cn(
                  'flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300 bg-white',
                  dragActive
                    ? 'border-[#1a4731] bg-emerald-50/10'
                    : 'border-slate-200 hover:border-[#1a4731]/40'
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  void uploadFiles(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById('product-image-input')?.click()}
              >
                <Upload className="mb-2 h-8 w-8 text-[#1a4731]" />
                <p className="text-center text-sm font-bold text-slate-700">Drag & drop images here, or click to browse</p>
                <p className="text-center text-xs text-slate-400 mt-1">Upload up to 3 premium showcase pictures</p>
                <input
                  id="product-image-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void uploadFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
              {form.formState.errors.images && <p className="text-xs text-red-600 font-medium">{String(form.formState.errors.images.message)}</p>}
              
              <div className="flex flex-wrap gap-4 pt-2 bg-white">
                {images.map((img, idx) => (
                  <div key={`${img.path}-${idx}`} className="relative h-28 w-28 overflow-hidden rounded-xl border border-slate-150 bg-white shadow-sm group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeImage(idx);
                      }}
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-[#1a4731] px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-sm">
                      {idx === 0 ? 'Main' : `${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Specifications */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#1a4731]" />
                <CardTitle className="text-base font-bold text-slate-900">Specifications</CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                className="border border-[#1a4731]/20 hover:border-[#1a4731] hover:bg-[#E6F0EB]/50 text-[#1a4731] font-bold rounded-xl transition-all h-9 bg-white"
                variant="outline"
                onClick={() => appendSpec({ key: '', value: '' })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              {specFields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-250 shadow-sm">
                  <Input
                    placeholder="Specification Name (e.g., Weight)"
                    className="flex-1 min-w-[120px] h-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-lg text-sm font-medium"
                    {...form.register(`specification.${index}.key` as const)}
                  />
                  <Input
                    placeholder="Value (e.g., 2.5 kg)"
                    className="flex-1 min-w-[120px] h-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-lg text-sm font-medium"
                    {...form.register(`specification.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-10 w-10 shrink-0"
                    disabled={specFields.length <= 1}
                    onClick={() => removeSpec(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card 4: Variants */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#1a4731]" />
                <CardTitle className="text-base font-bold text-slate-900">Variants</CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                className="border border-[#1a4731]/20 hover:border-[#1a4731] hover:bg-[#E6F0EB]/50 text-[#1a4731] font-bold rounded-xl transition-all h-9 bg-white"
                variant="outline"
                onClick={() => appendVariant({ size: '', color: '', stock: 0, price_modifier: 0 })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Variant
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              {variantFields.map((field, index) => (
                <div key={field.id} className="grid gap-4 rounded-2xl border border-slate-250 p-4 sm:grid-cols-12 bg-white shadow-sm">
                  <div className="sm:col-span-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Size</Label>
                    <Input
                      className="h-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-lg text-sm font-medium"
                      {...form.register(`variants.${index}.size` as const)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Color</Label>
                    <Input
                      className="h-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-lg text-sm font-medium"
                      {...form.register(`variants.${index}.color` as const)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Stock</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-lg text-sm font-medium"
                      {...form.register(`variants.${index}.stock`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Price Modifier (BDT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-lg text-sm font-medium"
                      {...form.register(`variants.${index}.price_modifier`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-end sm:col-span-1 justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-10 w-10 shrink-0"
                      disabled={variantFields.length <= 1}
                      onClick={() => removeVariant(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Publishing Details */}
        <div className="lg:col-span-4 space-y-8 bg-white">
          
          {/* Card 5: Pricing */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <DollarSign className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5 bg-white">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base Price (BDT) *</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min={0}
                    className="h-11 pl-8 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                    placeholder="0.00"
                    {...form.register('price', { valueAsNumber: true })}
                  />
                </div>
                {form.formState.errors.price && <p className="text-xs text-red-600 font-medium">{form.formState.errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer_price" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Offer Price (BDT)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                  <Input
                    id="offer_price"
                    type="number"
                    step="0.01"
                    min={0}
                    className="h-11 pl-8 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                    placeholder="Optional"
                    {...form.register('offer_price', { valueAsNumber: true })}
                  />
                </div>
                {form.formState.errors.offer_price && <p className="text-xs text-red-600 font-medium">{String(form.formState.errors.offer_price.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                  placeholder="0"
                  {...form.register('stock', { valueAsNumber: true })}
                />
                {form.formState.errors.stock && <p className="text-xs text-red-600 font-medium">{form.formState.errors.stock.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Organization */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <Layers className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Organization</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5 bg-white">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Category</Label>
                <Controller
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-150 bg-white">
                        <SelectItem value="__none__" className="text-slate-500">None</SelectItem>
                        {sortedCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {categoryLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Brand</Label>
                <Controller
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-150 bg-white">
                        <SelectItem value="__none__" className="text-slate-500">None</SelectItem>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slug *</Label>
                <Input
                  id="slug"
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                  {...slugRegister}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    slugTouched.current = true;
                    void slugRegister.onChange(e);
                  }}
                />
                {form.formState.errors.slug && <p className="text-xs text-red-600 font-medium">{form.formState.errors.slug.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="text-xs font-bold text-slate-500 uppercase tracking-widest">SKU *</Label>
                <Input
                  id="sku"
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                  {...form.register('sku')}
                />
                {form.formState.errors.sku && <p className="text-xs text-red-600 font-medium">{form.formState.errors.sku.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Card 7: Storefront Placement */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <CheckCircle className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Placement & Badges</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 bg-white">
              <div className="flex flex-col gap-3">
                <label className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-[#1a4731] focus:ring-[#1a4731]/20 transition-all"
                    {...form.register('is_best_selling')}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Best Selling</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Showcase on Home</span>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-[#1a4731] focus:ring-[#1a4731]/20 transition-all"
                    {...form.register('is_new_arrival')}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">New Arrival</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Fresh Catalog Badge</span>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-[#1a4731] focus:ring-[#1a4731]/20 transition-all"
                    {...form.register('is_product_of_the_day')}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Product of Day</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Daily Spotlight (Max 4)</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Special Segment</Label>
                <div className="grid gap-2">
                  {PRODUCT_SECTIONS.filter(s => !['best_selling', 'new_arrival', 'product_of_the_day'].includes(s)).map((sec) => (
                    <label key={sec} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 p-2.5 bg-white hover:border-[#1a4731]/30 transition-all select-none shadow-sm">
                      <input
                        type="radio"
                        className="h-4 w-4 text-[#1a4731] focus:ring-[#1a4731]/20 transition-all"
                        value={sec}
                        {...form.register('section')}
                      />
                      <span className="text-xs font-semibold capitalize text-slate-700">{sec.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {section === 'flash_sale' && (
                <div className="space-y-2 mt-4 p-4 bg-white rounded-xl border border-red-200 transition-all duration-300 shadow-sm">
                  <Label htmlFor="flash_sale_ends_at" className="text-red-950 font-bold text-xs uppercase tracking-wider block">Flash Sale Timer *</Label>
                  <Input
                    id="flash_sale_ends_at"
                    type="datetime-local"
                    className="h-10 bg-white border-red-200 focus:border-red-500 focus:ring-red-100 rounded-lg text-sm font-semibold"
                    {...form.register('flash_sale_ends_at')}
                  />
                  {form.formState.errors.flash_sale_ends_at && (
                    <p className="text-xs text-red-600 font-semibold">{form.formState.errors.flash_sale_ends_at.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 8: SEO & Tags */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <Globe className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">SEO & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5 bg-white">
              <div className="space-y-2">
                <Label htmlFor="perfect_for_str" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Perfect for (tags)</Label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="perfect_for_str"
                    placeholder="e.g. Men, Gifting, Summer"
                    className="h-11 pl-10 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-medium"
                    {...form.register('perfect_for_str')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_title" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Meta Title</Label>
                <Input
                  id="meta_title"
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-medium"
                  placeholder="Meta title for Google indexing"
                  {...form.register('meta_title')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  rows={3}
                  className="bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-medium p-3"
                  placeholder="Google search result snippet..."
                  {...form.register('meta_description')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
