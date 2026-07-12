// Use the @supabase/supabase-js admin client to execute raw SQL via the management API
import { createClient } from '../horof1/horof-1/node_modules/@supabase/supabase-js/dist/module/index.js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/)
  if (match) {
    env[match[1]] = match[2]?.trim() || '';
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('Running coupon schema migration...');

  // Step 1: Add missing columns to coupons table
  const alterCouponsSQL = `
    ALTER TABLE public.coupons
      ADD COLUMN IF NOT EXISTS min_order numeric(14,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_discount numeric(14,2),
      ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS start_date date,
      ADD COLUMN IF NOT EXISTS per_user_limit integer,
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  `;

  // Step 2: Create coupon_usages table
  const createUsagesSQL = `
    CREATE TABLE IF NOT EXISTS public.coupon_usages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      order_id bigint,
      used_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
  `;

  // Step 3: RLS policies
  const rlsSQL = `
    DROP POLICY IF EXISTS coupon_usages_select ON public.coupon_usages;
    CREATE POLICY coupon_usages_select ON public.coupon_usages FOR SELECT
      USING (auth.uid() = user_id OR public.is_admin());
    DROP POLICY IF EXISTS coupon_usages_insert ON public.coupon_usages;
    CREATE POLICY coupon_usages_insert ON public.coupon_usages FOR INSERT
      WITH CHECK (auth.uid() = user_id OR public.is_admin());
    DROP POLICY IF EXISTS coupon_usages_admin ON public.coupon_usages;
    CREATE POLICY coupon_usages_admin ON public.coupon_usages FOR ALL
      USING (public.is_admin()) WITH CHECK (public.is_admin());
    DROP POLICY IF EXISTS coupons_select ON public.coupons;
    CREATE POLICY coupons_select ON public.coupons FOR SELECT
      USING (public.is_admin() OR is_active = true);
  `;

  // Use admin API to run SQL - try the pg_dump approach
  // Actually, let's try RPC call using the anon function hack
  // Since exec_sql doesn't exist, we try to use the REST API for column check

  // First, test what columns exist
  const { data: sampleData, error: sampleErr } = await supabase
    .from('coupons')
    .select('*')
    .limit(1);
  
  if (sampleErr) {
    console.error('Error querying coupons:', sampleErr);
  } else {
    const cols = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
    console.log('Existing coupons columns:', cols);
  }

  // Try to add a coupon with the new columns to check if they exist
  const testInsert = {
    code: 'SCHEMATEST123',
    type: 'percent',
    value: 10,
    min_order: 0,
    used_count: 0,
    is_active: false
  };

  const { data: insertData, error: insertErr } = await supabase
    .from('coupons')
    .insert(testInsert)
    .select()
    .single();

  if (insertErr) {
    console.log('Insert error (columns may not exist):', insertErr.code, insertErr.message);
    console.log('\nNeed to manually run this SQL in Supabase SQL Editor:');
    console.log('\n--- SQL ---');
    console.log(alterCouponsSQL);
    console.log(createUsagesSQL);
    console.log(rlsSQL);
    console.log('--- END SQL ---');
  } else {
    console.log('Insert success! New columns exist:', Object.keys(insertData));
    // Cleanup
    await supabase.from('coupons').delete().eq('code', 'SCHEMATEST123');
    console.log('Test coupon cleaned up.');
  }
}

main().catch(console.error);
