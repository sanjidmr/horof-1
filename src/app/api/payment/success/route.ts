import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { validatePayment } from '@/lib/sslcommerz';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tran_id = formData.get('tran_id') as string;
    const val_id = formData.get('val_id') as string;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!tran_id || !val_id) {
      return NextResponse.redirect(`${baseUrl}/order-failed?reason=missing_data`, 303);
    }

    const supabase = await createSupabaseServerClient();

    // Validate with SSLCommerz
    const validationResponse = await validatePayment(val_id);

    if (validationResponse?.status === 'VALID' || validationResponse?.status === 'VALIDATED') {
      // Create admin client to bypass RLS for payment update
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Retrieve order to get its ID and user_id
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, user_id')
        .eq('transaction_id', tran_id)
        .single();

      // Update order status
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'paid', 
          payment_status: 'paid', 
          payment_method: 'online', 
          val_id 
        })
        .eq('transaction_id', tran_id);

      if (error) {
        console.error('Order Update Error:', error);
      }

      // Clear database cart items for this user
      if (order?.user_id) {
        try {
          const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          await supabaseAdmin.from('cart_items').delete().eq('user_id', order.user_id);
        } catch (clearCartErr) {
          console.error('Failed to clear database cart items:', clearCartErr);
        }
      }

      const orderId = order?.id || tran_id;
      return NextResponse.redirect(`${baseUrl}/payment-success?id=${orderId}`, 303);
    }

    // If validation fails
    return NextResponse.redirect(`${baseUrl}/order-failed?reason=validation_failed`, 303);
  } catch (error) {
    console.error('Payment Success Route Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/order-failed?reason=server_error`, 303);
  }
}
