import fs from 'fs';

// Simple parser for .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function querySupabase(queryUrl) {
  const res = await fetch(queryUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: await res.text() };
  }
  return { ok: true, data: await res.json() };
}

async function test() {
  console.log('Testing categories query with sort_order (REST API)...');
  const url1 = `${url}/rest/v1/categories?select=id,name,parent_id&is_active=eq.true&order=sort_order.asc`;
  const res1 = await querySupabase(url1);
  console.log('Result 1 (sort_order):', res1.ok ? `Success, found ${res1.data.length} categories` : `Error: ${res1.status} - ${res1.text}`);

  console.log('\nTesting categories query with order (REST API)...');
  const url2 = `${url}/rest/v1/categories?select=id,name,parent_id&is_active=eq.true&order=order.asc`;
  const res2 = await querySupabase(url2);
  console.log('Result 2 (order):', res2.ok ? `Success, found ${res2.data.length} categories` : `Error: ${res2.status} - ${res2.text}`);
  if (res2.ok) {
    console.log('Categories data:', res2.data);
  }

  console.log('\nTesting brands query (REST API)...');
  const url3 = `${url}/rest/v1/brands?select=id,name&is_active=eq.true&order=name.asc`;
  const res3 = await querySupabase(url3);
  console.log('Result 3 (brands):', res3.ok ? `Success, found ${res3.data.length} brands` : `Error: ${res3.status} - ${res3.text}`);
  if (res3.ok) {
    console.log('Brands data:', res3.data);
  }
}

test();
