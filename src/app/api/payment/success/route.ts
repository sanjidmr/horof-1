import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', val_id })
        .eq('transaction_id', tran_id);

      if (error) {
        console.error('Order Update Error:', error);
      }

      return NextResponse.redirect(`${baseUrl}/order-success?tran_id=${tran_id}`, 303);
    }

    // If validation fails
    return NextResponse.redirect(`${baseUrl}/order-failed?reason=validation_failed`, 303);
  } catch (error) {
    console.error('Payment Success Route Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/order-failed?reason=server_error`, 303);
  }
}
