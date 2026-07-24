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
  stock: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }, z.number().int().nonnegative()),
  price_modifier: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }, z.number()),
});

const quantityDiscountSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  discount_percent: z.coerce.number().min(0).max(100, 'Discount must be between 0 and 100'),
});

const specificationStepOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  price_modifier: z.coerce.number().default(0),
});

const specificationStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Step name is required'),
  description: z.string().optional().default(''),
  type: z.enum(['select', 'radio', 'text', 'file']),
  additional_price: z.coerce.number().nonnegative().default(0),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  options: z.array(specificationStepOptionSchema).optional().default([]),
});

const designChargeSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.coerce.number().nonnegative().default(0),
  description: z.string().optional().default(''),
});

const customerNotesSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional().default(''),
  placeholder: z.string().optional().default(''),
});

const pricingConfigSchema = z.object({
  min_order_qty: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 1;
    const n = Number(v);
    return Number.isNaN(n) || n <= 0 ? 1 : n;
  }, z.number().int().positive().default(1)),
  max_order_qty: z
    .preprocess((v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isNaN(n)) return null;
      if (n === 0) return null;
      return n;
    }, z.union([z.number().int().positive(), z.null()]))
    .optional(),
});

const orderRequestSettingsSchema = z.object({
  enable_order_requests: z.boolean().default(true),
  enable_add_to_cart: z.boolean().default(true),
  enable_direct_order: z.boolean().default(false),
  auto_approval: z.boolean().default(false),
});

const displayControlsSchema = z.object({
  show_discount_table: z.boolean().default(true),
  show_specifications: z.boolean().default(true),
  show_customer_notes: z.boolean().default(true),
  show_quantity_selector: z.boolean().default(true),
  show_design_charge: z.boolean().default(true),
  show_total_price: z.boolean().default(true),
  show_send_request: z.boolean().default(true),
  show_add_to_cart: z.boolean().default(true),
});

const orderConfigSchema = z.object({
  quantity_discounts: z.array(quantityDiscountSchema).optional().default([]),
  specification_steps: z.array(specificationStepSchema).optional().default([]),
  design_charge: designChargeSchema.optional(),
  customer_notes_settings: customerNotesSettingsSchema.optional(),
  pricing_config: pricingConfigSchema.optional(),
  order_request_settings: orderRequestSettingsSchema.optional(),
  display_controls: displayControlsSchema.optional(),
});

const productDetailRowSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const productFormSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().min(1, 'Name is required'),
    slug: z.string().optional().default(''),
    sku: z.string().optional().default(''),
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
    product_details: z.array(productDetailRowSchema).optional().default([]),
    perfect_for_str: z.string().optional().default(''),
    perfect_for_tags: z.array(z.string()).optional().default([]),
    section: sectionSchema,
    is_best_selling: z.boolean().default(false),
    is_new_arrival: z.boolean().default(false),
    is_product_of_the_day: z.boolean().default(false),
    flash_sale_ends_at: z.string().optional().nullable(),
    meta_title: z.string().optional().default(''),
    meta_description: z.string().optional().default(''),
    category_id: z
      .union([z.literal(''), z.literal('__none__'), z.string().uuid()])
      .optional()
      .nullable()
      .transform((v) => (!v || v === '__none__' ? null : v)),
    subcategory_id: z
      .union([z.literal(''), z.literal('__none__'), z.string().uuid()])
      .optional()
      .nullable()
      .transform((v) => (!v || v === '__none__' ? null : v)),
    brand_id: z
      .union([z.literal(''), z.literal('__none__'), z.string().uuid()])
      .optional()
      .nullable()
      .transform((v) => (!v || v === '__none__' ? null : v)),
    images: z.array(imageSchema).max(3, 'Maximum 3 images'),
    variants: z.array(variantSchema).optional().default([]),
    order_config: orderConfigSchema.optional(),
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

export function specToRows(spec: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(spec ?? {}).map(([key, value]) => ({ key, value }));
}

export function detailsToObject(rows: { key: string; value: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (k) out[k] = r.value.trim();
  }
  return out;
}

export function objectToDetails(obj: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(obj ?? {}).map(([key, value]) => ({ key, value }));
}
