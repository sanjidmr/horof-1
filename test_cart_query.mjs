import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuqkwojmzgvrjqvlfxor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cWt3b2ptemd2cmpxdmxmeG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTk2OTgsImV4cCI6MjA5MzQ3NTY5OH0.8BPG1hOmpcvNOHjHncQuzbKSqzVdavwJRXjqSPoHtKQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      quantity,
      product_id,
      products (
        id,
        name,
        description,
        price,
        offer_price,
        stock,
        perfect_for,
        product_images (
          image_url,
          sort_order
        ),
        categories (
          name
        )
      )
    `)
    .limit(1);
    
  if (error) {
    console.log("ERROR DETAILS:", error.message, error.details, error.hint, error.code);
    console.log("FULL ERROR:", JSON.stringify(error));
  } else {
    console.log("SUCCESS:", data);
  }
}

test();
