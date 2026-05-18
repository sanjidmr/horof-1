import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tran_id = formData.get('tran_id') as string;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (tran_id) {
      const supabase = await createSupabaseServerClient();
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('transaction_id', tran_id);
    }

    return NextResponse.redirect(`${baseUrl}/order-cancelled?tran_id=${tran_id || ''}`, 303);
  } catch (error) {
    console.error('Payment Cancel Route Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/order-cancelled?reason=server_error`, 303);
  }
}
