import { productFormSchema } from '../src/lib/validation/product-form.ts';

// Simulate what ProductForm sends on submit
const testData = {
  name: 'Test Product',
  slug: 'test-product-xyz',
  price: 100,
  stock: 10,
  section: 'best_selling' as const,
  category_id: '836faa3c-9ca1-4fc3-a208-08200ff59c7c',
  brand_id: null,
  images: [{ path: 'uploads/test.jpg', url: 'https://nuqkwojmzgvrjqvlfxor.supabase.co/storage/v1/object/public/product-images/uploads/test.jpg' }],
  is_best_selling: true,
  is_new_arrival: false,
  is_product_of_the_day: false,
  description: 'A test product description',
  sku: '',
  offer_price: undefined,
  perfect_for_str: '',
  specification: [{ key: '', value: '' }],
  flash_sale_ends_at: null,
  meta_title: '',
  meta_description: '',
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

const result = productFormSchema.safeParse(testData);
if (result.success) {
  console.log('✅ Validation PASSED');
  console.log('category_id:', result.data.category_id);
  console.log('brand_id:', result.data.brand_id);
  console.log('section:', result.data.section);
} else {
  console.log('❌ Validation FAILED:');
  console.log(JSON.stringify(result.error.format(), null, 2));
}
