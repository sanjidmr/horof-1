import { z } from 'zod';

export const PRODUCT_SECTIONS = [
  'best_selling',
  'new_arrival',
  'product_of_the_day',
  'flash_sale',
  'exclusive_offer',
] as const;

export type ProductSectionValue = (typeof PRODUCT_SECTIONS)[number];

const sectionSchema = z.enum(PRODUCT_SECTIONS);

const specRowSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const imageSchema = z.object({
  path: z.string().min(1),
  url: z.string().url(),
});

const variantSchema = z.object({
  size: z.string().optional().default(''),
  color: z.string().optional().default(''),
  stock: z.coerce.number().int().nonnegative(),
  price_modifier: z.coerce.number(),
});

export const productFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Name is required'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'Slug: lowercase letters, numbers, hyphens only'),
    sku: z.string().min(1, 'SKU is required'),
    price: z.coerce.number().nonnegative('Price must be 0 or greater'),
    offer_price: z
      .preprocess((v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = typeof v === 'number' ? v : Number(v);
        if (Number.isNaN(n)) return null;
        if (n === 0) return null;
        return n;
      }, z.union([z.number().nonnegative(), z.null()]))
      .optional(),
    stock: z.coerce.number().int().nonnegative('Stock must be a whole number ≥ 0'),
    description: z.string().optional().default(''),
    specification: z.array(specRowSchema).optional().default([]),
    perfect_for_str: z.string().optional().default(''),
    section: sectionSchema,
    is_best_selling: z.boolean().default(false),
    is_new_arrival: z.boolean().default(false),
    is_product_of_the_day: z.boolean().default(false),
    flash_sale_ends_at: z.string().optional().nullable(),
    meta_title: z.string().optional().default(''),
    meta_description: z.string().optional().default(''),
    category_id: z
      .union([z.literal(''), z.string().uuid()])
      .optional()
      .transform((v) => (!v ? null : v)),
    brand_id: z
      .union([z.literal(''), z.string().uuid()])
      .optional()
      .transform((v) => (!v ? null : v)),
    images: z.array(imageSchema).max(3, 'Maximum 3 images'),
    variants: z.array(variantSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.section === 'flash_sale') {
      if (!data.flash_sale_ends_at || !data.flash_sale_ends_at.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flash sale end date is required',
          path: ['flash_sale_ends_at'],
        });
      }
    }
    if (data.offer_price != null && data.offer_price > 0 && data.offer_price >= data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Offer price must be less than regular price',
        path: ['offer_price'],
      });
    }
  });

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductFormParsed = z.output<typeof productFormSchema>;

export function specificationToRows(spec: unknown): { key: string; value: string }[] {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return [{ key: '', value: '' }];
  }
  const entries = Object.entries(spec as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: value == null ? '' : String(value),
  }));
  return entries.length ? entries : [{ key: '', value: '' }];
}

export function rowsToSpecification(rows: { key: string; value: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (k) out[k] = r.value.trim();
  }
  return out;
}
