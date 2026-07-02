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
  // Insert a temp product
  const { data: p } = await supabase.from('products').insert({
    name: "col-check", slug: "col-check-" + Date.now(), description: "t", price: 1, stock: 1, sku: "", section: "best_selling"
  }).select('id').single();

  // Try with 'url' instead of 'image_url'
  const { data: d1, error: e1 } = await supabase.from('product_images').insert({
    product_id: p.id, url: "https://example.com/test.jpg", sort_order: 0,
  }).select('*');
  
  if (e1) {
    console.log("'url' column failed:", e1.message);
  } else {
    console.log("'url' column WORKS! Columns:", Object.keys(d1[0]));
  }

  // Cleanup
  await supabase.from('product_images').delete().eq('product_id', p.id);
  await supabase.from('products').delete().eq('id', p.id);
}

run();
