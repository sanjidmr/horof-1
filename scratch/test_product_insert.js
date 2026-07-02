import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let val = match[2].trim();
    env[match[1]] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  // Check what columns products table has live
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const spec = await res.json();
  const productsDef = spec.definitions['products'];
  console.log('Live products columns:', Object.keys(productsDef.properties));
  
  // Try to insert a minimal product with all the fields our code sends
  const testPayload = {
    name: 'TEST PRODUCT DELETE ME',
    slug: 'test-product-delete-me-12345',
    price: 100,
    compare_price: null,
    stock: 1,
    description: 'test',
    image: '',
    images: [],
    specification: {},
    perfect_for: null,
    is_best_selling: false,
    is_new_arrival: false,
    is_product_of_the_day: false,
    category_id: '836faa3c-9ca1-4fc3-a208-08200ff59c7c',
    quantity_discounts: [],
    specification_steps: [],
    design_charge_enabled: false,
    design_charge_amount: 0,
    design_charge_notes: '',
    custom_placeholder: '',
    sku: '',
    section: 'best_selling',
    flash_sale_ends_at: null,
    meta_title: '',
    meta_description: '',
    brand_id: null,
    customer_notes_enabled: false,
    customer_notes_title: '',
    min_order_qty: 1,
    max_order_qty: null,
    order_request_settings: null,
    display_controls: null,
    updated_at: new Date().toISOString(),
  };

  console.log('\nTrying to insert product with all fields...');
  const insertRes = await fetch(`${url}/rest/v1/products`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(testPayload),
  });

  if (insertRes.ok) {
    const inserted = await insertRes.json();
    console.log('Insert SUCCESS! Product id:', inserted[0]?.id);
    // Clean up
    if (inserted[0]?.id) {
      await fetch(`${url}/rest/v1/products?id=eq.${inserted[0].id}`, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      console.log('Cleaned up test product');
    }
  } else {
    const errBody = await insertRes.text();
    console.error('Insert FAILED:', insertRes.status, errBody);
    
    // Try without updated_at
    console.log('\nRetrying without updated_at...');
    delete testPayload.updated_at;
    const insertRes2 = await fetch(`${url}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testPayload),
    });
    if (insertRes2.ok) {
      const inserted2 = await insertRes2.json();
      console.log('Retry SUCCESS! Product id:', inserted2[0]?.id);
      if (inserted2[0]?.id) {
        await fetch(`${url}/rest/v1/products?id=eq.${inserted2[0].id}`, {
          method: 'DELETE',
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        console.log('Cleaned up test product');
      }
    } else {
      const errBody2 = await insertRes2.text();
      console.error('Retry also FAILED:', insertRes2.status, errBody2);
    }
  }
}

test();
