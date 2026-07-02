import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("--- Testing insert with modified payload matching DB columns ---");
  const testPayload = {
    name: "Test Product " + Date.now(),
    slug: "test-product-" + Date.now(),
    price: 1500,
    compare_price: 2000,
    image: "https://example.com/main-image.jpg",
    images: ["https://example.com/main-image.jpg", "https://example.com/other-image.jpg"],
    description: "This is a test product description with correct columns.",
    stock: 50,
    is_active: true,
    category_id: null,
    is_best_selling: true,
    is_new_arrival: false,
    is_product_of_the_day: false,
    perfect_for: "Gift, Home, Office",
    specification: { "Material": "Wood", "Size": "12x12 inches" },
    quantity_discounts: [
      { quantity: 5, discount_percent: 10 },
      { quantity: 10, discount_percent: 20 }
    ],
    specification_steps: [
      {
        id: "d3b07384-d113-4ec5-a587-84e207222830",
        name: "Choose Acrylic Color",
        type: "select",
        required: true,
        active: true,
        options: [
          { name: "Golden Mirror", price_modifier: 0 },
          { name: "Black", price_modifier: -100 }
        ]
      }
    ],
    design_charge_enabled: true,
    design_charge_amount: 150,
    design_charge_notes: "Custom design setup fee",
    custom_placeholder: "Enter name to print"
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('products')
    .insert(testPayload)
    .select('*');

  if (insertErr) {
    console.error("Insert failed!");
    console.error("Message:", insertErr.message);
    console.error("Details:", insertErr.details);
    console.error("Code:", insertErr.code);
  } else {
    console.log("Insert SUCCESS!");
    console.log("Inserted product ID:", inserted[0].id);
    console.log("Inserted product details:", inserted[0]);

    // Clean up
    const { error: deleteErr } = await supabase
      .from('products')
      .delete()
      .eq('id', inserted[0].id);
    if (deleteErr) {
      console.error("Cleanup failed:", deleteErr);
    } else {
      console.log("Cleanup success!");
    }
  }
}

run();
