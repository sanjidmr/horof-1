import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const payload = {
    name: "Valid Test Product",
    slug: "valid-test-product-" + Date.now(),
    price: 150,
    stock: 20,
    description: "This is a description that matches the schema.",
    image: "https://example.com/image.jpg",
    images: ["https://example.com/image.jpg"],
    is_active: true,
    is_best_selling: false,
    is_new_arrival: true,
    is_product_of_the_day: false,
    compare_price: 180,
    specification: { "Material": "Oak Wood" },
    perfect_for: "Decor, Gift"
  };

  console.log('Inserting payload:', payload);
  const { data, error } = await supabase.from('products').insert(payload).select('id').single();

  if (error) {
    console.error('Insert failed!');
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
    console.error('Code:', error.code);
  } else {
    console.log('Insert SUCCESS! Inserted ID:', data);
  }
}

testInsert();
