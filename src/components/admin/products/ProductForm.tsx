'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X, Image as ImageIcon, DollarSign, Layers, FileText, Globe, CheckCircle, Package, Percent, ChevronDown, ChevronUp, ToggleLeft, Eye, MessageSquare, SlidersHorizontal, ClipboardList } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { saveProduct, type SaveProductResult } from '@/lib/actions/save-product';
import {
  productFormSchema,
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
    .replace(/[\s_-]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
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
export type SubcategoryOption = { id: string; category_id: string; name: string; slug: string; sort_order: number; is_active: boolean };
export type ProductFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  sku?: string;
  price?: number;
  offer_price?: number | null;
  cost_price?: number | null;
  stock?: number;
  description?: string | null;
  specification?: unknown;
  product_details?: { key: string; value: string }[] | null;
  section?: ProductFormValues['section'];
  flash_sale_ends_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  brand_id?: string | null;
  images?: { id?: string | number; url: string }[];
  variants?: { size?: string | null; color?: string | null; stock: number; price_modifier: number }[];
  order_config?: {
    quantity_discounts?: { quantity: number; discount_percent: number }[];
    specification_steps?: {
      id: string;
      name: string;
      description?: string;
      type: 'select' | 'radio' | 'text' | 'file';
      additional_price?: number;
      required: boolean;
      active: boolean;
      options?: { name: string; price_modifier: number }[];
    }[];
    design_charge?: { enabled: boolean; amount: number; description: string };
    customer_notes_settings?: { enabled: boolean; title: string; placeholder: string };
    pricing_config?: { min_order_qty: number; max_order_qty?: number | null };
    order_request_settings?: { enable_order_requests: boolean; enable_add_to_cart: boolean; enable_direct_order: boolean; auto_approval: boolean };
    display_controls?: { show_discount_table: boolean; show_specifications: boolean; show_customer_notes: boolean; show_quantity_selector: boolean; show_design_charge: boolean; show_total_price: boolean; show_send_request: boolean; show_add_to_cart: boolean };
  } | null;
};

type ProductFormProps = {
  mode: 'create' | 'edit';
  categories: CategoryOption[];
  subcategories?: SubcategoryOption[];
  initial?: ProductFormInitial | null;
};

const defaultValuesBase: Partial<ProductFormValues> = {
  name: '',
  slug: '',
  sku: '',
  price: 0,
  cost_price: undefined,
  offer_price: undefined,
  stock: 0,
  description: '',
  specification: [],
  product_details: [],
  section: 'best_selling',
  flash_sale_ends_at: '',
  meta_title: '',
  meta_description: '',
  category_id: '',
  subcategory_id: '',
  brand_id: undefined,
  images: [],
  variants: [],
  order_config: {
    quantity_discounts: [],
    specification_steps: [],
    design_charge: { enabled: false, amount: 0, description: '' },
    customer_notes_settings: { enabled: false, title: 'Specification Need Details', placeholder: '' },
    pricing_config: { min_order_qty: 1, max_order_qty: null },
    order_request_settings: { enable_order_requests: true, enable_add_to_cart: true, enable_direct_order: false, auto_approval: false },
    display_controls: { show_discount_table: true, show_specifications: true, show_customer_notes: true, show_quantity_selector: true, show_design_charge: true, show_total_price: true, show_send_request: true, show_add_to_cart: true },
  },
};


export function ProductForm({ mode, categories, subcategories = [], initial }: ProductFormProps) {
  const router = useRouter();
  const slugTouched = useRef(false);
  const [dragActive, setDragActive] = useState(false);

  const defaultValues = useMemo((): ProductFormValues => {
    if (!initial) {
      return { ...defaultValuesBase, id: undefined } as ProductFormValues;
    }
    const imgs =
      initial.images?.map((row) => {
        const url = row.url;
        const path = extractStoragePath(url) ?? `legacy:${url.slice(-40)}`;
        return { id: (row as any).id || undefined, path, url };
      }) ?? [];

    const specRows = (() => {
      if (!initial.specification) return [];
      if (Array.isArray(initial.specification)) return initial.specification as { key: string; value: string }[];
      if (typeof initial.specification === 'object') {
        return Object.entries(initial.specification as Record<string, string>).map(([k, v]) => ({ key: k, value: v }));
      }
      return [];
    })();

    const detailRows = initial.product_details ?? [];

    return {
      ...defaultValuesBase,
      id: initial.id,
      name: initial.name ?? '',
      slug: initial.slug ?? '',
      sku: initial.sku ?? '',
      price: Number(initial.price ?? 0),
      cost_price: initial.cost_price != null ? Number(initial.cost_price) : undefined,
      offer_price: initial.offer_price != null ? Number(initial.offer_price) : undefined,
      stock: Number(initial.stock ?? 0),
      description: initial.description ?? '',
      specification: specRows.length > 0 ? specRows : (defaultValuesBase.specification ?? []),
      product_details: detailRows.length > 0 ? detailRows : (defaultValuesBase.product_details ?? []),
      section: (initial.section as ProductFormValues['section']) ?? 'best_selling',
      flash_sale_ends_at: isoToDatetimeLocal(initial.flash_sale_ends_at ?? undefined),
      meta_title: initial.meta_title ?? '',
      meta_description: initial.meta_description ?? '',
      category_id: (initial.category_id as '' | (string & {})) ?? '',
      subcategory_id: (initial.subcategory_id as '' | (string & {})) ?? '',
      images: imgs,
      order_config: {
        quantity_discounts: initial.order_config?.quantity_discounts ?? [],
        specification_steps: (initial.order_config?.specification_steps ?? []).map(s => ({
          id: s.id || crypto.randomUUID(),
          name: s.name,
          description: s.description ?? '',
          type: s.type ?? 'select',
          additional_price: Number(s.additional_price ?? 0),
          required: !!s.required,
          active: s.active !== false,
          options: (s.options ?? []).map(o => ({ name: o.name, price_modifier: Number(o.price_modifier ?? 0) })),
        })),
        design_charge: initial.order_config?.design_charge ?? { enabled: false, amount: 0, description: '' },
        customer_notes_settings: initial.order_config?.customer_notes_settings ?? { enabled: false, title: 'Specification Need Details', placeholder: '' },
        pricing_config: initial.order_config?.pricing_config ?? { min_order_qty: 1, max_order_qty: null },
        order_request_settings: initial.order_config?.order_request_settings ?? { enable_order_requests: true, enable_add_to_cart: true, enable_direct_order: false, auto_approval: false },
        display_controls: initial.order_config?.display_controls ?? { show_discount_table: true, show_specifications: true, show_customer_notes: true, show_quantity_selector: true, show_design_charge: true, show_total_price: true, show_send_request: true, show_add_to_cart: true },
      },
    } as ProductFormValues;
  }, [initial]);


  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
    values: defaultValues,
  });

  const { fields: discountFields, append: appendDiscount, remove: removeDiscount, move: moveDiscount } = useFieldArray({
    control: form.control,
    name: 'order_config.quantity_discounts',
  });

  const { fields: stepFields, append: appendStep, remove: removeStep, move: moveStep } = useFieldArray({
    control: form.control,
    name: 'order_config.specification_steps',
  });

  const { fields: specFields, append: appendSpec, remove: removeSpec, move: moveSpec } = useFieldArray({
    control: form.control,
    name: 'specification',
  });

  const { fields: detailFields, append: appendDetail, remove: removeDetail, move: moveDetail } = useFieldArray({
    control: form.control,
    name: 'product_details',
  });

  const [draggedDiscountIdx, setDraggedDiscountIdx] = useState<number | null>(null);
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);
  const [draggedSpecIdx, setDraggedSpecIdx] = useState<number | null>(null);
  const [draggedDetailIdx, setDraggedDetailIdx] = useState<number | null>(null);

  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});

  // Submission lock to prevent race conditions
  const submittingRef = useRef(false);
  const toggleStep = (id: string) => setOpenSteps(p => ({ ...p, [id]: !p[id] }));

  const section = form.watch('section');
  const name = form.watch('name');
  const images = form.watch('images') ?? [];
  const watchCategoryId = form.watch('category_id');

  const filteredSubcategories = subcategories.filter(
    s => s.category_id === watchCategoryId && s.is_active
  );

  useEffect(() => {
    const catId = form.getValues('category_id');
    const subId = form.getValues('subcategory_id');
    if (subId && catId) {
      const belongs = subcategories.some(s => s.id === subId && s.category_id === catId);
      if (!belongs) {
        form.setValue('subcategory_id', '', { shouldValidate: true });
      }
    }
  }, [watchCategoryId, subcategories, form]);

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

  const [saveError, setSaveError] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSaveError(null);
      try {
      const sb = createSupabaseBrowserClient();

      if (values.section === 'product_of_the_day' && sb) {
        try {
          let query = sb
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('section', 'product_of_the_day');

          if (values.id) {
            query = query.neq('id', values.id);
          }

          const { count, error: countErr } = await query;
          if (!countErr && count !== null && count >= 4) {
            toast.error('You can select a maximum of 4 Products of the Day. Please deselect another product first.');
            return;
          }
        } catch (e) {
          console.warn('Product of the day count check failed, proceeding with save:', e);
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

      // Validate image URLs before saving
      if (payload.images && payload.images.length > 0) {
        const invalidImages = payload.images.filter(img => !img.url || typeof img.url !== 'string' || !img.url.startsWith('http'));
        if (invalidImages.length > 0) {
          toast.error(`${invalidImages.length} image(s) have invalid URLs. Please re-upload them.`);
          submittingRef.current = false;
          return;
        }
      }

      const res = await saveProduct(payload) as SaveProductResult;
      if (res.ok) {
        toast.success(mode === 'create' ? 'Product saved successfully' : 'Product updated successfully');
        try { router.refresh(); } catch (_) {}
        setTimeout(() => { router.push('/admin/products'); }, 150);
      } else {
        const err = res as Extract<SaveProductResult, { ok: false }>;
        setSaveError(err.message);
        toast.error(err.message);
        if (err.issues?.length) {
          for (const i of err.issues.slice(0, 5)) {
            const path = i.path.map(String).join('.');
            form.setError(path as never, { message: i.message });
          }
        }
      }
      } catch (e: any) {
        const msg = e?.message || 'An unexpected error occurred while saving';
        setSaveError(msg);
        toast.error(msg);
        console.error('Save error:', e);
      } finally {
        submittingRef.current = false;
      }
    },
    (errors) => {
      const extractErrors = (obj: any, prefix = ''): string[] => {
        const msgs: string[] = [];
        for (const [key, val] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (val && typeof val === 'object' && 'message' in val) {
            msgs.push(`${path}: ${(val as any).message}`);
          } else if (val && typeof val === 'object') {
            msgs.push(...extractErrors(val, path));
          }
        }
        return msgs;
      };

      const allErrors = extractErrors(errors);
      console.error('FORM VALIDATION ERRORS:', allErrors);

      if (allErrors.length > 0) {
        allErrors.slice(0, 3).forEach(msg => toast.error(msg));
      } else {
        toast.error('Please fix the highlighted form fields before saving');
      }
    }
  );

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

          {saveError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl max-w-sm">
              <p className="font-bold mb-1">Failed to save product:</p>
              <p>{saveError}</p>
            </div>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || submittingRef.current}
            className="bg-[#1a4731] hover:bg-[#256044] text-white font-bold px-6 py-2.5 rounded-full shadow-lg shadow-forest-900/10 hover:shadow-forest-900/20 hover:-translate-y-0.5 transition-all duration-200 h-11 min-w-[160px]"
          >
            {form.formState.isSubmitting || submittingRef.current ? 'Saving Product…' : 'Save Product'}
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
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-black font-medium"
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

          {/* Specifications section */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#1a4731]" />
                <CardTitle className="text-base font-bold text-slate-900">Specifications</CardTitle>
              </div>
              <Button type="button" size="sm" variant="outline" className="border border-[#1a4731]/20 hover:border-[#1a4731] hover:bg-[#E6F0EB]/50 text-[#1a4731] font-bold rounded-xl transition-all h-9 bg-white" onClick={() => appendSpec({ key: '', value: '' })}>
                <Plus className="mr-1 h-4 w-4" /> Add Spec
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-3 bg-white">
              {specFields.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No specifications yet. Add technical specs, dimensions, or attributes.</p>}
              {specFields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDraggedSpecIdx(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedSpecIdx !== null && draggedSpecIdx !== index) {
                      moveSpec(draggedSpecIdx, index);
                    }
                    setDraggedSpecIdx(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 transition-all",
                    draggedSpecIdx === index ? "opacity-40 border-dashed border-[#1a4731]" : ""
                  )}
                >
                  <div className="text-slate-400 select-none cursor-grab font-mono text-sm px-1 shrink-0">☰</div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attribute</Label>
                    <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" placeholder="e.g. Weight" {...form.register(`specification.${index}.key`)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Value</Label>
                    <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" placeholder="e.g. 2.5 kg" {...form.register(`specification.${index}.value`)} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-5">
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-700 rounded-lg" disabled={index === 0} onClick={() => moveSpec(index, index - 1)}>▲</Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-700 rounded-lg" disabled={index === specFields.length - 1} onClick={() => moveSpec(index, index + 1)}>▼</Button>
                    <Button type="button" size="icon" variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-9 w-9 shrink-0" onClick={() => removeSpec(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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

          {/* ───── ORDER CONFIGURATION ───── */}

          {/* Quantity Discount Settings */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-[#1a4731]" />
                <CardTitle className="text-base font-bold text-slate-900">Quantity Discount Settings</CardTitle>
              </div>
              <Button type="button" size="sm" variant="outline" className="border border-[#1a4731]/20 hover:border-[#1a4731] hover:bg-[#E6F0EB]/50 text-[#1a4731] font-bold rounded-xl transition-all h-9 bg-white" onClick={() => appendDiscount({ quantity: 5, discount_percent: 0 })}>
                <Plus className="mr-1 h-4 w-4" /> Add Tier
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-3 bg-white">
              {discountFields.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No discount tiers yet. Add tiers to offer quantity-based discounts.</p>}
              {discountFields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDraggedDiscountIdx(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedDiscountIdx !== null && draggedDiscountIdx !== index) {
                      moveDiscount(draggedDiscountIdx, index);
                    }
                    setDraggedDiscountIdx(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 transition-all",
                    draggedDiscountIdx === index ? "opacity-40 border-dashed border-[#1a4731]" : ""
                  )}
                >
                  <div className="text-slate-400 select-none cursor-grab font-mono text-sm px-1">☰</div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity (PCS)</Label>
                    <Input type="text" inputMode="numeric" className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" {...form.register(`order_config.quantity_discounts.${index}.quantity`)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discount %</Label>
                    <Input type="text" inputMode="decimal" className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" {...form.register(`order_config.quantity_discounts.${index}.discount_percent`)} />
                  </div>
                  <div className="flex items-center gap-1 mt-5 shrink-0">
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-700 rounded-lg" disabled={index === 0} onClick={() => moveDiscount(index, index - 1)}>
                      ▲
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-700 rounded-lg" disabled={index === discountFields.length - 1} onClick={() => moveDiscount(index, index + 1)}>
                      ▼
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-9 w-9 shrink-0" onClick={() => removeDiscount(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Specification Steps Builder */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#1a4731]" />
                <CardTitle className="text-base font-bold text-slate-900">Product Specification Steps</CardTitle>
              </div>
              <Button type="button" size="sm" variant="outline" className="border border-[#1a4731]/20 hover:border-[#1a4731] hover:bg-[#E6F0EB]/50 text-[#1a4731] font-bold rounded-xl transition-all h-9 bg-white"
                onClick={() => { const nid = crypto.randomUUID(); appendStep({ id: nid, name: '', description: '', type: 'select', additional_price: 0, required: false, active: true, options: [] }); setOpenSteps(p => ({ ...p, [nid]: true })); }}>
                <Plus className="mr-1 h-4 w-4" /> Add Step
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              {stepFields.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No steps yet. Add steps to let customers configure their order.</p>}
              {stepFields.map((field, stepIdx) => {
                const isOpen = openSteps[field.id] ?? false;
                const stepType = form.watch(`order_config.specification_steps.${stepIdx}.type`);
                const stepActive = form.watch(`order_config.specification_steps.${stepIdx}.active`);
                const stepName = form.watch(`order_config.specification_steps.${stepIdx}.name`);
                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => setDraggedStepIdx(stepIdx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedStepIdx !== null && draggedStepIdx !== stepIdx) {
                        moveStep(draggedStepIdx, stepIdx);
                      }
                      setDraggedStepIdx(null);
                    }}
                    className={cn(
                      'rounded-2xl border transition-all duration-200 bg-white',
                      stepActive ? 'border-slate-200' : 'border-slate-150 opacity-60',
                      draggedStepIdx === stepIdx ? "opacity-40 border-dashed border-[#1a4731]" : ""
                    )}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="text-slate-400 select-none cursor-grab font-mono text-sm px-1">☰</div>
                      <button type="button" onClick={() => toggleStep(field.id)} className="flex-1 flex items-center gap-3 text-left">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0', stepActive ? 'bg-[#1a4731] text-white' : 'bg-slate-200 text-slate-500')}>{stepIdx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{stepName || 'Untitled Step'}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{stepType} · {stepActive ? 'Active' : 'Inactive'}</p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg" disabled={stepIdx === 0} onClick={() => moveStep(stepIdx, stepIdx - 1)}>
                          ▲
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg" disabled={stepIdx === stepFields.length - 1} onClick={() => moveStep(stepIdx, stepIdx + 1)}>
                          ▼
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 w-8 shrink-0" onClick={() => removeStep(stepIdx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-100 p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step Name *</Label>
                            <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm" placeholder="e.g. Choose Size" {...form.register(`order_config.specification_steps.${stepIdx}.name`)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Type</Label>
                            <Controller control={form.control} name={`order_config.specification_steps.${stepIdx}.type`} render={({ field: f }) => (
                              <Select value={f.value} onValueChange={f.onChange}>
                                <SelectTrigger className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="select">Dropdown Select</SelectItem>
                                  <SelectItem value="radio">Radio Buttons</SelectItem>
                                  <SelectItem value="text">Text Input</SelectItem>
                                  <SelectItem value="file">File Upload</SelectItem>
                                </SelectContent>
                              </Select>
                            )} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description (optional)</Label>
                          <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm" placeholder="Helper text shown to the customer" {...form.register(`order_config.specification_steps.${stepIdx}.description`)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add. Price (BDT)</Label>
                            <Input type="text" inputMode="decimal" className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm" {...form.register(`order_config.specification_steps.${stepIdx}.additional_price`)} />
                          </div>
                          <div className="flex flex-col gap-2 pt-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Required</Label>
                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1a4731]" {...form.register(`order_config.specification_steps.${stepIdx}.required`)} />
                              <span className="text-xs font-semibold text-slate-600">Required</span>
                            </label>
                          </div>
                          <div className="flex flex-col gap-2 pt-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visibility</Label>
                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1a4731]" {...form.register(`order_config.specification_steps.${stepIdx}.active`)} />
                              <span className="text-xs font-semibold text-slate-600">Active</span>
                            </label>
                          </div>
                        </div>
                        {(stepType === 'select' || stepType === 'radio') && (
                          <StepOptionsEditor form={form} stepIdx={stepIdx} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Design Charge */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <DollarSign className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Design Charge</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1a4731]" {...form.register('order_config.design_charge.enabled')} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Enable Design Charge</span>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Add a fixed design fee to orders</span>
                </div>
              </label>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Design Fee (BDT)</Label>
                <Input type="text" inputMode="decimal" className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" placeholder="0.00" {...form.register('order_config.design_charge.amount')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</Label>
                <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm" placeholder="e.g. Professional design service" {...form.register('order_config.design_charge.description')} />
              </div>
            </CardContent>
          </Card>

          {/* Customer Notes Box */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <MessageSquare className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Customer Notes Box</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1a4731]" {...form.register('order_config.customer_notes_settings.enabled')} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Show Notes Field</span>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Let customers add special instructions</span>
                </div>
              </label>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field Title</Label>
                <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm" placeholder="Specification Need Details" {...form.register('order_config.customer_notes_settings.title')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placeholder Text</Label>
                <Input className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm" placeholder="e.g. Describe your design requirements..." {...form.register('order_config.customer_notes_settings.placeholder')} />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Pricing Config */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <SlidersHorizontal className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Advanced Pricing Config</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Order Qty *</Label>
                  <Input type="text" inputMode="numeric" className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" {...form.register('order_config.pricing_config.min_order_qty')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Order Qty</Label>
                  <Input type="text" inputMode="numeric" className="h-9 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-sm font-semibold" placeholder="Unlimited" {...form.register('order_config.pricing_config.max_order_qty')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Request Settings */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <ToggleLeft className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Order Request Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 bg-white">
              {([
                { field: 'order_config.order_request_settings.enable_order_requests' as const, label: 'Enable Order Requests', sub: 'Show the "Send Request" button on product page' },
                { field: 'order_config.order_request_settings.enable_add_to_cart' as const, label: 'Enable Add to Cart', sub: 'Show the "Add to Cart" button on product page' },
                { field: 'order_config.order_request_settings.enable_direct_order' as const, label: 'Enable Direct Order', sub: 'Allow instant checkout without approval' },
                { field: 'order_config.order_request_settings.auto_approval' as const, label: 'Auto-Approve Requests', sub: 'Approve order requests automatically' },
              ] as const).map(({ field, label, sub }) => (
                <label key={field} className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1a4731]" {...form.register(field)} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{label}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{sub}</span>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Display Controls */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-2 bg-white">
              <Eye className="h-5 w-5 text-[#1a4731]" />
              <CardTitle className="text-base font-bold text-slate-900">Display Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 bg-white">
              {([
                { field: 'order_config.display_controls.show_discount_table' as const, label: 'Show Discount Table' },
                { field: 'order_config.display_controls.show_specifications' as const, label: 'Show Spec Steps' },
                { field: 'order_config.display_controls.show_customer_notes' as const, label: 'Show Notes Field' },
                { field: 'order_config.display_controls.show_quantity_selector' as const, label: 'Show Quantity Selector' },
                { field: 'order_config.display_controls.show_design_charge' as const, label: 'Show Design Charge' },
                { field: 'order_config.display_controls.show_total_price' as const, label: 'Show Total Price' },
                { field: 'order_config.display_controls.show_send_request' as const, label: 'Show Send Request Button' },
                { field: 'order_config.display_controls.show_add_to_cart' as const, label: 'Show Add to Cart Button' },
              ] as const).map(({ field, label }) => (
                <label key={field} className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-200 p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1a4731]" {...form.register(field)} />
                  <span className="text-xs font-bold text-slate-800">{label}</span>
                </label>
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
                    type="text"
                    inputMode="decimal"
                    className="h-11 pl-8 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                    placeholder="0.00"
                    {...form.register('price')}
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
                    type="text"
                    inputMode="decimal"
                    className="h-11 pl-8 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                    placeholder="Optional"
                    {...form.register('offer_price')}
                  />
                </div>
                {form.formState.errors.offer_price && <p className="text-xs text-red-600 font-medium">{String(form.formState.errors.offer_price.message)}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cost Price (BDT)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                  <Input
                    id="cost_price"
                    type="text"
                    inputMode="decimal"
                    className="h-11 pl-8 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                    placeholder="For profit/loss calculation"
                    {...form.register('cost_price')}
                  />
                </div>
                <p className="text-[11px] text-slate-400">Used for COGS and profit/loss calculation. Leave blank if not applicable.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base Stock *</Label>
                <Input
                  id="stock"
                  type="text"
                  inputMode="numeric"
                  className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none text-slate-900 font-semibold"
                  placeholder="0"
                  {...form.register('stock')}
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
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Subcategory</Label>
                <Controller
                  control={form.control}
                  name="subcategory_id"
                  render={({ field }) => (
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      disabled={!watchCategoryId || filteredSubcategories.length === 0}
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-200 focus:border-[#1a4731] focus:ring-[#1a4731]/10 rounded-xl transition-all duration-200 shadow-none">
                        <SelectValue placeholder={watchCategoryId ? 'Select subcategory' : 'Select a category first'} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-150 bg-white">
                        <SelectItem value="__none__" className="text-slate-500">None</SelectItem>
                        {filteredSubcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Section</label>
                {(['best_selling', 'new_arrival', 'product_of_the_day', 'flash_sale', 'exclusive_offer'] as const).map((val) => (
                  <label
                    key={val}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3 bg-white hover:border-[#1a4731]/30 transition-all select-none shadow-sm ${
                      section === val ? 'border-[#1a4731] ring-1 ring-[#1a4731]/20' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      className="h-4.5 w-4.5 text-[#1a4731] focus:ring-[#1a4731]/20 transition-all"
                      value={val}
                      checked={section === val}
                      onChange={() => form.setValue('section', val, { shouldDirty: true })}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        {val === 'best_selling' && 'Best Selling'}
                        {val === 'new_arrival' && 'New Arrival'}
                        {val === 'product_of_the_day' && 'Product of the Day'}
                        {val === 'flash_sale' && 'Flash Sale'}
                        {val === 'exclusive_offer' && 'Exclusive Offer'}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">
                        {val === 'best_selling' && 'Showcase on Home'}
                        {val === 'new_arrival' && 'Fresh Catalog Badge'}
                        {val === 'product_of_the_day' && 'Daily Spotlight (Max 4)'}
                        {val === 'flash_sale' && 'Limited Time Offer'}
                        {val === 'exclusive_offer' && 'Special Deal'}
                      </span>
                    </div>
                  </label>
                ))}
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

interface StepOptionsEditorProps {
  form: UseFormReturn<any>;
  stepIdx: number;
}

import { UseFormReturn } from 'react-hook-form';

function StepOptionsEditor({ form, stepIdx }: StepOptionsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `order_config.specification_steps.${stepIdx}.options`
  });

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100 mt-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Options / Choices</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs border border-[#1a4731]/20 text-[#1a4731] hover:bg-[#E6F0EB]/50 font-bold rounded-lg"
          onClick={() => append({ name: '', price_modifier: 0 })}
        >
          <Plus className="mr-1 h-3 w-3" /> Add Option
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="text-[11px] text-slate-400 italic">No options added yet. Add options for select/radio inputs.</p>
      )}
      <div className="space-y-2">
        {fields.map((field, optionIdx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              placeholder="Option name (e.g. Red, XL)"
              className="h-8 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-xs flex-1"
              {...form.register(`order_config.specification_steps.${stepIdx}.options.${optionIdx}.name`)}
            />
            <div className="relative w-28 shrink-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">৳</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Modifier"
                className="h-8 pl-5 bg-white border-slate-200 focus:border-[#1a4731] rounded-lg text-xs"
                {...form.register(`order_config.specification_steps.${stepIdx}.options.${optionIdx}.price_modifier`)}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 w-8 shrink-0"
              onClick={() => remove(optionIdx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

