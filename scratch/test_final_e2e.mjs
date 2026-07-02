import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
  const ts = Date.now();
  let allPassed = true;

  // ── Test 1: Full product insert with ALL payload fields ──
  console.log("── Test 1: Full product insert ──");
  const payload = {
    name: "Final E2E " + ts, slug: "final-e2e-" + ts, price: 2000, compare_price: 1500,
    stock: 30, description: "Final end-to-end test", image: "https://example.com/img.jpg",
    images: ["https://example.com/img.jpg", "https://example.com/img2.jpg"],
    specification: { Material: "Acrylic", Size: "12x12" }, perfect_for: "Home, Office",
    is_best_selling: true, is_new_arrival: false, is_product_of_the_day: false, category_id: null,
    quantity_discounts: [{ quantity: 5, discount_percent: 10 }], specification_steps: [],
    design_charge_enabled: true, design_charge_amount: 200, design_charge_notes: "Custom design",
    custom_placeholder: "Enter your name",
    sku: "FINAL-001", section: "best_selling", flash_sale_ends_at: null,
    meta_title: "Final Test", meta_description: "Test desc", brand_id: null,
    customer_notes_enabled: true, customer_notes_title: "Notes", min_order_qty: 2, max_order_qty: 50,
    order_request_settings: { enable_order_requests: true, enable_add_to_cart: true, enable_direct_order: false, auto_approval: false },
    display_controls: { show_discount_table: true, show_specifications: true, show_customer_notes: true, show_quantity_selector: true, show_design_charge: true, show_total_price: true, show_send_request: true, show_add_to_cart: true },
  };

  const { data: p, error: pErr } = await supabase.from('products').insert(payload).select('*').single();
  if (pErr) { console.error("  ❌ FAILED:", pErr.message); allPassed = false; }
  else { console.log("  ✅ Product inserted, id:", p.id); }

  if (!p) { console.error("Cannot continue without product"); return; }

  // ── Test 2: product_images with 'url' column ──
  console.log("── Test 2: product_images insert ──");
  const { error: imgErr } = await supabase.from('product_images').insert({ product_id: p.id, url: "https://example.com/img.jpg", sort_order: 0 });
  if (imgErr) { console.error("  ❌ FAILED:", imgErr.message); allPassed = false; }
  else { console.log("  ✅ Image inserted"); }

  // ── Test 3: product_variants ──
  console.log("── Test 3: product_variants insert ──");
  const { error: varErr } = await supabase.from('product_variants').insert({ product_id: p.id, size: "XL", color: "Blue", stock: 10, price_modifier: 50 });
  if (varErr) { console.error("  ❌ FAILED:", varErr.message); allPassed = false; }
  else { console.log("  ✅ Variant inserted"); }

  // ── Test 4: Read back and verify all new fields ──
  console.log("── Test 4: Read back verification ──");
  const { data: readBack } = await supabase.from('products').select('sku,section,meta_title,meta_description,brand_id,customer_notes_enabled,customer_notes_title,min_order_qty,max_order_qty,order_request_settings,display_controls').eq('id', p.id).single();
  const checks = [
    ['sku', readBack.sku, 'FINAL-001'],
    ['section', readBack.section, 'best_selling'],
    ['meta_title', readBack.meta_title, 'Final Test'],
    ['customer_notes_enabled', readBack.customer_notes_enabled, true],
    ['customer_notes_title', readBack.customer_notes_title, 'Notes'],
    ['min_order_qty', readBack.min_order_qty, 2],
    ['max_order_qty', readBack.max_order_qty, 50],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual === expected) { console.log(`  ✅ ${field}: ${actual}`); }
    else { console.error(`  ❌ ${field}: expected ${expected}, got ${actual}`); allPassed = false; }
  }
  if (readBack.order_request_settings && readBack.order_request_settings.enable_order_requests === true) {
    console.log("  ✅ order_request_settings: JSONB OK");
  } else { console.error("  ❌ order_request_settings: missing or wrong"); allPassed = false; }
  if (readBack.display_controls && readBack.display_controls.show_discount_table === true) {
    console.log("  ✅ display_controls: JSONB OK");
  } else { console.error("  ❌ display_controls: missing or wrong"); allPassed = false; }

  // ── Cleanup ──
  await supabase.from('product_images').delete().eq('product_id', p.id);
  await supabase.from('product_variants').delete().eq('product_id', p.id);
  await supabase.from('products').delete().eq('id', p.id);
  console.log("── Cleanup done ──\n");

  console.log(allPassed ? "🎉 ALL TESTS PASSED — Save Product pipeline is fully operational!" : "⚠️ Some tests failed, see above.");
}

run();
