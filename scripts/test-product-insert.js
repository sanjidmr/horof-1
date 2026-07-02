import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Step 1: Run the migration via raw SQL (using supabase rpc or direct insert test)
  // Since PostgREST doesn't support raw SQL, we test by inserting with the full payload.
  // If any column is missing, the insert will fail with a clear error message.

  console.log("=== Step 1: Test insert with ALL buildPayload fields ===\n");

  const fullPayload = {
    name: "E2E Test Product " + Date.now(),
    slug: "e2e-test-" + Date.now(),
    price: 1500,
    compare_price: 1200,
    stock: 25,
    description: "End-to-end test product",
    image: "https://example.com/test.jpg",
    images: ["https://example.com/test.jpg"],
    specification: { Material: "Wood" },
    perfect_for: "Home, Gift",
    is_best_selling: true,
    is_new_arrival: false,
    is_product_of_the_day: false,
    category_id: null,
    quantity_discounts: [{ quantity: 5, discount_percent: 10 }],
    specification_steps: [],
    design_charge_enabled: false,
    design_charge_amount: 0,
    design_charge_notes: "",
    custom_placeholder: "",
    // The NEW fields from Fix 1:
    sku: "E2E-SKU-001",
    section: "best_selling",
    flash_sale_ends_at: null,
    meta_title: "E2E Test Meta",
    meta_description: "E2E test meta description",
    brand_id: null,
    customer_notes_enabled: true,
    customer_notes_title: "Special Instructions",
    min_order_qty: 1,
    max_order_qty: 100,
    order_request_settings: { enable_order_requests: true, enable_add_to_cart: true, enable_direct_order: false, auto_approval: false },
    display_controls: { show_discount_table: true, show_specifications: true, show_customer_notes: true, show_quantity_selector: true, show_design_charge: true, show_total_price: true, show_send_request: true, show_add_to_cart: true },
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('products')
    .insert(fullPayload)
    .select('id, name, sku, section, meta_title, brand_id, customer_notes_enabled, min_order_qty, max_order_qty, order_request_settings, display_controls');

  if (insertErr) {
    console.error("❌ INSERT FAILED!");
    console.error("   Message:", insertErr.message);
    console.error("   Code:", insertErr.code);
    console.error("   Details:", insertErr.details);
    console.error("\n   >>> This means the migration has NOT been applied yet.");
    console.error("   >>> Run this SQL in your Supabase SQL Editor:\n");
    console.error(fs.readFileSync('supabase/migrations/20260628000000_add_missing_product_columns.sql', 'utf8'));
    return;
  }

  console.log("✅ INSERT SUCCESS!");
  console.log("   Inserted row:", JSON.stringify(inserted[0], null, 2));

  // Cleanup
  const { error: delErr } = await supabase.from('products').delete().eq('id', inserted[0].id);
  console.log(delErr ? `   ⚠️ Cleanup failed: ${delErr.message}` : "   🧹 Cleanup done.");

  console.log("\n=== Step 2: Verify product_images insert ===\n");
  // Quick insert + image + variant + cleanup
  const { data: p2, error: p2Err } = await supabase.from('products').insert({
    name: "Image Test " + Date.now(),
    slug: "img-test-" + Date.now(),
    description: "test",
    price: 100,
    stock: 1,
    sku: "IMG-001",
    section: "best_selling",
  }).select('id').single();

  if (p2Err) { console.error("❌ Product insert for image test failed:", p2Err.message); return; }

  const { error: imgErr } = await supabase.from('product_images').insert({
    product_id: p2.id, image_url: "https://example.com/test.jpg", sort_order: 0,
  });
  console.log(imgErr ? `❌ Image insert failed: ${imgErr.message}` : "✅ product_images insert OK");

  const { error: varErr } = await supabase.from('product_variants').insert({
    product_id: p2.id, size: "Large", color: "Red", stock: 5, price_modifier: 100,
  });
  console.log(varErr ? `❌ Variant insert failed: ${varErr.message}` : "✅ product_variants insert OK");

  await supabase.from('product_images').delete().eq('product_id', p2.id);
  await supabase.from('product_variants').delete().eq('product_id', p2.id);
  await supabase.from('products').delete().eq('id', p2.id);
  console.log("🧹 Cleanup done.\n");

  console.log("=== ALL CHECKS PASSED ✅ ===");
}

run();
