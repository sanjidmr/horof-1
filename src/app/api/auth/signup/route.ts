import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password should be at least 6 characters' },
        { status: 400 }
      );
    }

    // Strict email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid real email address' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email immediately!
    });

    if (error) {
      // Catch duplicate/existing accounts
      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email address already exists' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create admin notification (optional but matching original signup behavior)
    try {
      const { createNotification } = await import('@/lib/actions/notifications');
      await createNotification(
        'New Customer Registered',
        `A new user (${email}) has just registered on the platform.`,
        'customer'
      );
    } catch (e) {
      console.error('Failed to create notification:', e);
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
