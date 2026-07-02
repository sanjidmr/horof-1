import { z } from 'zod';

const PRODUCT_SECTIONS = [
  'best_selling',
  'new_arrival',
  'product_of_the_day',
  'flash_sale',
  'exclusive_offer',
];

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
  min_order_qty: z.coerce.number().int().positive().default(1),
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

const testProductFormSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().min(1, 'Name is required'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'Slug: lowercase letters, numbers, hyphens only'),
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
    perfect_for_str: z.string().optional().default(''),
    section: z.enum(PRODUCT_SECTIONS),
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

// 1. Test with default values
const defaultValues = {
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

console.log("--- Testing Default Values (Should fail on name, slug) ---");
const res1 = testProductFormSchema.safeParse(defaultValues);
if (!res1.success) {
  console.log("Errors:", res1.error.flatten().fieldErrors);
} else {
  console.log("Success!");
}

// 2. Test with fully-filled valid values
const validValues = {
  name: 'Premium Wooden Wall Clock',
  slug: 'premium-wooden-wall-clock',
  sku: 'PWC-001',
  price: 2500,
  offer_price: 2200,
  stock: 50,
  description: 'Handcrafted premium wooden wall clock.',
  specification: [{ key: 'Material', value: 'Mahogany Wood' }],
  perfect_for_str: 'Living Room, Office, Gift',
  section: 'best_selling',
  flash_sale_ends_at: '',
  meta_title: 'Premium Wooden Wall Clock',
  meta_description: 'Buy handcrafted premium wooden wall clock.',
  category_id: 'e3f0535e-c013-43f1-b952-6e1be87754b2', // Valid UUID format
  brand_id: '',
  images: [
    { path: 'uploads/clock1.jpg', url: 'https://example.com/clock1.jpg' }
  ],
  is_best_selling: true,
  is_new_arrival: false,
  is_product_of_the_day: false,
  variants: [{ size: '12 inches', color: 'Brown', stock: 20, price_modifier: 0 }],
  order_config: {
    quantity_discounts: [{ quantity: 5, discount_percent: 5 }],
    specification_steps: [],
    design_charge: { enabled: true, amount: 200, description: 'Custom engraving' },
    customer_notes_settings: { enabled: true, title: 'Engraving Name', placeholder: 'Enter name' },
    pricing_config: { min_order_qty: 1, max_order_qty: 10 },
    order_request_settings: { enable_order_requests: true, enable_add_to_cart: true, enable_direct_order: false, auto_approval: false },
    display_controls: { show_discount_table: true, show_specifications: true, show_customer_notes: true, show_quantity_selector: true, show_design_charge: true, show_total_price: true, show_send_request: true, show_add_to_cart: true },
  },
};

console.log("\n--- Testing Valid Filled Values (Should pass) ---");
const res2 = testProductFormSchema.safeParse(validValues);
if (!res2.success) {
  console.log("Errors:", res2.error.flatten().fieldErrors);
} else {
  console.log("Success!", res2.data);
}
