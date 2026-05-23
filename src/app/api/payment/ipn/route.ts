import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { validatePayment } from '@/lib/sslcommerz';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tran_id = formData.get('tran_id') as string;
    const val_id = formData.get('val_id') as string;
    const status = formData.get('status') as string;

    if (tran_id && val_id && status === 'VALID') {
      const validationResponse = await validatePayment(val_id);

      if (validationResponse?.status === 'VALID' || validationResponse?.status === 'VALIDATED') {
        // Create admin client to bypass RLS for webhook
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Fetch order to get user_id
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('user_id')
          .eq('transaction_id', tran_id)
          .single();

        await supabaseAdmin
          .from('orders')
          .update({ status: 'paid', val_id })
          .eq('transaction_id', tran_id)
          .eq('status', 'pending'); // Only update if it is currently pending

        // Clear database cart items for this user
        if (order?.user_id) {
          try {
            const supabaseAdmin = createSupabaseClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supabaseAdmin.from('cart_items').delete().eq('user_id', order.user_id);
          } catch (clearCartErr) {
            console.error('Failed to clear database cart items in IPN:', clearCartErr);
          }
        }
      }
    }

    return NextResponse.json({ message: 'IPN Received' });
  } catch (error) {
    console.error('IPN Route Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
