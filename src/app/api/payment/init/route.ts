import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { initPayment } from '@/lib/sslcommerz';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customer, delivery_charge, delivery_type, subtotal, total_amount } = body;

        const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login first to place an order.' }, { status: 401 });
    }

    const tran_id = `TRAN_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create pending order
    const { error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null,
        transaction_id: tran_id,
        amount: total_amount,
        status: 'pending',
        product_details: items,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: customer.address,
        delivery_charge: delivery_charge || 0,
        delivery_type: delivery_type || null
      });

    if (dbError) {
      console.error('Database Error:', dbError);
      throw new Error('Failed to create order');
    }

    const paymentParams = {
      total_amount,
      currency: 'BDT',
      tran_id,
      success_url: `${baseUrl}/api/payment/success`,
      fail_url: `${baseUrl}/api/payment/fail`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      ipn_url: `${baseUrl}/api/payment/ipn`,
      product_name: items?.map((i: any) => i.name).join(', ') || 'Order',
      cus_name: customer.name,
      cus_email: customer.email || 'guest@example.com',
      cus_phone: customer.phone,
      cus_add1: customer.address,
    };

    const sslResponse = await initPayment(paymentParams);

    if (sslResponse?.status === 'SUCCESS') {
      return NextResponse.json({ url: sslResponse.GatewayPageURL });
    } else {
      return NextResponse.json({ error: 'Failed to initiate payment', details: sslResponse }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Payment Init Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
