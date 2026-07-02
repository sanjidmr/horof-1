import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  // Check live product_images schema
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const spec = await res.json();
  const piDef = spec.definitions['product_images'];
  if (piDef) {
    console.log('Live product_images columns:', Object.keys(piDef.properties));
  } else {
    console.log('product_images not found in live spec');
  }

  // Try inserting a test image with sort_order to see if it fails
  const productsRes = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const products = await productsRes.json();
  console.log('First product id:', products[0]?.id);
  
  if (products[0]?.id) {
    const insertRes = await fetch(`${url}/rest/v1/product_images`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ product_id: products[0].id, url: 'https://test.example.com/test.jpg', sort_order: 0 }),
    });
    const insertResult = await insertRes.json();
    console.log('Test insert result (sort_order):', insertResult);
    
    // Clean up
    if (insertResult[0]?.id) {
      await fetch(`${url}/rest/v1/product_images?id=eq.${insertResult[0].id}`, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      console.log('Cleaned up test record');
    }
  }
}

test();
