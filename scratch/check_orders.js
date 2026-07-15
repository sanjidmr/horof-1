import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function checkOrderItems() {
  const { data: items, error } = await supabase.from('order_items').select('*').limit(5);
  if (error) {
    console.error('Error fetching order items:', error);
  } else {
    console.log('Order items count:', items.length);
    console.log('Order items data:', JSON.stringify(items, null, 2));
  }
}

checkOrderItems();
