import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuqkwojmzgvrjqvlfxor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cWt3b2ptemd2cmpxdmxmeG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzg5OTY5OCwiZXhwIjoyMDkzNDc1Njk4fQ.oXrcgJE3rp1a_w92UXC91p5pmFm49ieNISH3WUZhyJc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const userId = 'da7e0972-89a3-4c61-ab52-dabbbbd2f6ed';
  const productId = 23;

  console.log("1. Inserting test cart item...");
  const { data: insertData, error: insertError } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      product_id: productId,
      quantity: 2
    })
    .select();

  if (insertError) {
    console.error("Insert failed:", insertError);
    return;
  }
  console.log("Insert success:", insertData);

  console.log("2. Querying cart items with joins...");
  const { data: selectData, error: selectError } = await supabase
    .from('cart_items')
    .select(`
      quantity,
      product_id,
      products (
        id,
        name,
        description,
        price,
        compare_price,
        stock,
        perfect_for,
        product_images (
          url,
          sort_order
        ),
        categories (
          name
        )
      )
    `)
    .eq('user_id', undefined);

  if (selectError) {
    console.error("Select failed:", selectError);
  } else {
    console.log("Select success:", JSON.stringify(selectData, null, 2));
  }

  console.log("3. Cleaning up test cart item...");
  const { error: deleteError } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error("Delete failed:", deleteError);
  } else {
    console.log("Clean up success.");
  }
}

test();
