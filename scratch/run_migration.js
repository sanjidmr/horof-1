const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://nuqkwojmzgvrjqvlfxor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cWt3b2ptemd2cmpxdmxmeG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzg5OTY5OCwiZXhwIjoyMDkzNDc1Njk4fQ.oXrcgJE3rp1a_w92UXC91p5pmFm49ieNISH3WUZhyJc';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('supabase/migrations/20260723000004_fix_coupon_system_comprehensive.sql', 'utf8');

async function main() {
  console.log('Executing migration SQL...');
  
  // Use the SQL REST endpoint to execute raw SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({})
  });
  
  // Try direct SQL execution via pg_query or exec_sql
  const { data: execResult, error: execError } = await supabase.rpc('exec_sql', { sql_text: sql }).catch(e => ({ data: null, error: e }));
  
  if (execError) {
    console.log('exec_sql not available, trying alternative...');
    
    // Try with exec
    const { data: exec2, error: exec2Err } = await supabase.rpc('exec', { query: sql }).catch(e => ({ data: null, error: e }));
    if (exec2Err) {
      console.log('exec not available either.');
      console.log('Migration may need to be run via Supabase dashboard SQL editor.');
      
      // Check current state
      console.log('\n--- Current DB State ---');
      
      // Check coupons table
      const { data: sample, error: sampleErr } = await supabase.from('coupons').select('*').limit(1);
      if (!sampleErr && sample?.length > 0) {
        console.log('Coupon columns:', Object.keys(sample[0]));
      }
      
      // Check coupon_usage table
      const { data: usageSample, error: usageErr } = await supabase.from('coupon_usage').select('*').limit(1).catch(e => ({ data: null, error: e }));
      if (!usageErr) {
        console.log('coupon_usage columns:', usageSample?.length > 0 ? Object.keys(usageSample[0]) : 'exists but empty');
      } else {
        console.log('coupon_usage:', usageErr.message);
      }
      
      // Check is_admin function
      const { data: adminCheck, error: adminErr } = await supabase.rpc('is_admin');
      console.log('is_admin():', adminErr ? 'ERR: ' + adminErr.message : 'OK');
      
      // Check increment_coupon_used_count
      const { data: incCheck, error: incErr } = await supabase.rpc('increment_coupon_used_count', { p_coupon_id: '00000000-0000-0000-0000-000000000000' }).catch(e => ({ data: null, error: e }));
      console.log('increment_coupon_used_count:', incErr ? 'ERR: ' + incErr.message : 'OK');
      
      console.log('\n--- SQL to run manually in Supabase SQL Editor ---');
      console.log('Open: https://supabase.com/dashboard/project/nuqkwojmzgvrjqvlfxor/sql/new');
      console.log('Paste the content of: supabase/migrations/20260723000004_fix_coupon_system_comprehensive.sql');
    } else {
      console.log('exec result:', exec2);
    }
  } else {
    console.log('Migration executed successfully:', execResult);
  }
}

main().catch(console.error);