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
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const spec = await res.json();
  const productsDef = spec.definitions.products;
  if (productsDef) {
    console.log('Live products columns:', Object.keys(productsDef.properties));
  } else {
    console.log('Products definition not found in OpenAPI spec');
  }
}

test();
