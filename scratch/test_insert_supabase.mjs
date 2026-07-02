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
    name: "Test Product",
    slug: "test-product-" + Date.now(),
    sku: "TEST-SKU-" + Date.now(),
    price: 100,
    stock: 10,
    description: "This is a test product description.",
    specification: { "Weight": "1kg" },
    perfect_for: ["Gifting"],
    section: "best_selling"
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
