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

async function inspectColumns() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Columns in products table:', data[0] ? Object.keys(data[0]) : 'No data, columns unknown');
    console.log('Sample row data:', data[0]);
  }
}

inspectColumns();
