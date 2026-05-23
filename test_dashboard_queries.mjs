import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuqkwojmzgvrjqvlfxor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cWt3b2ptcmd2cmpxdmxmeG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzg5OTY5OCwiZXhwIjoyMDkzNDc1Njk4fQ.oXrcgJE3rp1a_w92UXC91p5pmFm49ieNISH3WUZhyJc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrderItemJoin() {
  console.log("--- Testing Order Items Join Products ---");
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      products (
        id,
        name,
        price,
        compare_price
      )
    `)
    .limit(1);

  if (error) {
    console.error("Order Items Join failed:");
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Code:", error.code);
  } else {
    console.log("Order Items Join SUCCESS!", data);
  }
}

testOrderItemJoin();
