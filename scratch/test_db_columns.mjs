import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuqkwojmzgvrjqvlfxor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cWt3b2ptcmd2cmpxdmxmeG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTk2OTgsImV4cCI6MjA5MzQ3NTY5OH0.8BPG1hOmpcvNOHjHncQuzbKSqzVdavwJRXjqSPoHtKQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Error fetching product:', error);
  } else {
    console.log('Product columns:', Object.keys(data[0] || {}));
    console.log('Sample product:', data[0]);
  }
}

inspect();
