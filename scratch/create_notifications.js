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

// Try creating notifications table using Supabase Management API
const sql = `
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'customer', 'stock', 'product')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view notifications" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update notifications" ON public.notifications
  FOR UPDATE USING (true);

CREATE POLICY "Admin can delete notifications" ON public.notifications
  FOR DELETE USING (true);
`;

console.log('SQL to create notifications table:');
console.log(sql);

// Check if there is an existing way to do this via REST API
async function testViaRest() {
  const res = await fetch(`${url}/rest/v1/notifications?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  if (res.ok) {
    console.log('\n✅ notifications table EXISTS in live database');
  } else {
    const err = await res.text();
    console.log('\n❌ notifications table DOES NOT EXIST:', err);
    console.log('\nPlease run the SQL above in your Supabase SQL Editor');
  }
}

testViaRest();
