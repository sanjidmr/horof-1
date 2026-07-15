import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually to ensure correct keys
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to:', url);
console.log('Using Key starting with:', key ? key.substring(0, 15) : 'undefined');

const supabase = createClient(url, key);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('orders').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Error fetching orders count:', error);
    } else {
      console.log('Success! Total orders in DB:', data);
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}

testConnection();
