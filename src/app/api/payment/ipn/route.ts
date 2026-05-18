import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
        const supabase = await createSupabaseServerClient();
        await supabase
          .from('orders')
          .update({ status: 'paid', val_id })
          .eq('transaction_id', tran_id)
          .eq('status', 'pending'); // Only update if it is currently pending
      }
    }

    return NextResponse.json({ message: 'IPN Received' });
  } catch (error) {
    console.error('IPN Route Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
