import fs from 'fs';

// Simple parser for .env.local
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing URL or service key');
    return;
  }
  
  console.log('Fetching schema from:', supabaseUrl);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Save summary of paths and definitions
    const info = {
      paths: Object.keys(data.paths || {}),
      definitions: Object.keys(data.definitions || {})
    };
    
    fs.writeFileSync('db_schema_summary.json', JSON.stringify(info, null, 2));
    fs.writeFileSync('db_schema_full.json', JSON.stringify(data, null, 2));
    console.log('Saved db_schema_summary.json and db_schema_full.json successfully!');
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

run();
