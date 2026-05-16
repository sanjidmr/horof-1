'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X } from 'lucide-react';
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
      perfect_for_str: (initial.perfect_for ?? []).join(', '),
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
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === 'create' ? 'Add product' : 'Edit product'}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save product'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              {...slugRegister}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                slugTouched.current = true;
                void slugRegister.onChange(e);
              }}
            />
            {form.formState.errors.slug && <p className="text-xs text-red-600">{form.formState.errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" {...form.register('sku')} />
            {form.formState.errors.sku && <p className="text-xs text-red-600">{form.formState.errors.sku.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
            <Label>Brand</Label>
            <Controller
              control={form.control}
              name="brand_id"
              render={({ field }) => (
                <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & stock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="price">Price (BDT) *</Label>
            <Input id="price" type="number" step="0.01" min={0} {...form.register('price', { valueAsNumber: true })} />
            {form.formState.errors.price && <p className="text-xs text-red-600">{form.formState.errors.price.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer_price">Offer price</Label>
            <Input id="offer_price" type="number" step="0.01" min={0} {...form.register('offer_price', { valueAsNumber: true })} />
            {form.formState.errors.offer_price && <p className="text-xs text-red-600">{String(form.formState.errors.offer_price.message)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock *</Label>
            <Input id="stock" type="number" min={0} {...form.register('stock', { valueAsNumber: true })} />
            {form.formState.errors.stock && <p className="text-xs text-red-600">{form.formState.errors.stock.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-[#1B4332] focus:ring-[#1B4332]" {...form.register('is_best_selling')} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">Best Selling</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Home Showcase</span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-[#1B4332] focus:ring-[#1B4332]" {...form.register('is_new_arrival')} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">New Arrival</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Fresh Collection</span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
              <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-[#1B4332] focus:ring-[#1B4332]" {...form.register('is_product_of_the_day')} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">Product of Day</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Daily Spotlight</span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Special Categories</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRODUCT_SECTIONS.filter(s => !['best_selling', 'new_arrival', 'product_of_the_day'].includes(s)).map((sec) => (
                <label key={sec} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                  <input type="radio" className="h-4 w-4 text-[#1B4332]" value={sec} {...form.register('section')} />
                  <span className="text-sm capitalize text-slate-700">{sec.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {section === 'flash_sale' && (
            <div className="space-y-2 mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
              <Label htmlFor="flash_sale_ends_at" className="text-red-900 font-bold">Flash sale ends *</Label>
              <Input id="flash_sale_ends_at" type="datetime-local" {...form.register('flash_sale_ends_at')} className="border-red-200 focus:ring-red-500" />
              {form.formState.errors.flash_sale_ends_at && (
                <p className="text-xs text-red-600 font-medium">{form.formState.errors.flash_sale_ends_at.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images (max 3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              'flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition-colors dark:border-slate-700 dark:bg-slate-900/50',
              dragActive && 'border-slate-900 bg-slate-100 dark:border-slate-300'
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
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-center text-sm text-slate-600">Drag & drop images here, or click to browse</p>
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
          {form.formState.errors.images && <p className="text-xs text-red-600">{String(form.formState.errors.images.message)}</p>}
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={`${img.path}-${idx}`} className="relative h-28 w-28 overflow-hidden rounded-md border bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeImage(idx);
                  }}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[10px] text-white">{idx === 0 ? 'Main' : idx + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={6} {...form.register('description')} placeholder="Product description" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Specifications</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => appendSpec({ key: '', value: '' })}>
            <Plus className="mr-1 h-4 w-4" /> Row
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {specFields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap gap-2">
              <Input placeholder="Key" className="flex-1 min-w-[120px]" {...form.register(`specification.${index}.key` as const)} />
              <Input placeholder="Value" className="flex-1 min-w-[120px]" {...form.register(`specification.${index}.value` as const)} />
              <Button type="button" size="icon" variant="ghost" disabled={specFields.length <= 1} onClick={() => removeSpec(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfect for (tags)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Comma-separated e.g. Men, Gifting, Summer" {...form.register('perfect_for_str')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => appendVariant({ size: '', color: '', stock: 0, price_modifier: 0 })}>
            <Plus className="mr-1 h-4 w-4" /> Variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {variantFields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-12 dark:border-slate-800">
              <div className="sm:col-span-3">
                <Label className="text-xs">Size</Label>
                <Input {...form.register(`variants.${index}.size` as const)} />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Color</Label>
                <Input {...form.register(`variants.${index}.color` as const)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Stock</Label>
                <Input type="number" min={0} {...form.register(`variants.${index}.stock`, { valueAsNumber: true })} />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Price modifier</Label>
                <Input type="number" step="0.01" {...form.register(`variants.${index}.price_modifier`, { valueAsNumber: true })} />
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button type="button" size="icon" variant="ghost" disabled={variantFields.length <= 1} onClick={() => removeVariant(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta_title">Meta title</Label>
            <Input id="meta_title" {...form.register('meta_title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta description</Label>
            <Textarea id="meta_description" rows={3} {...form.register('meta_description')} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
