import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  let redirectUrl = `${origin}/login?error=Could_not_authenticate`

  const getForwardUrl = async (userId: string) => {
    // Priority 1: Check auth user metadata (set by service role during creation)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const meta = authUser?.user_metadata || {}
    const appMeta = authUser?.app_metadata || {}

    if (meta.is_warehouse_staff === true || appMeta.is_warehouse_staff === true) {
      return '/admin/warehouse/orders'
    }
    if (meta.role === 'admin' || appMeta.role === 'admin') {
      return '/admin/dashboard'
    }

    // Priority 2: Check DB profile (may fail if columns missing)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_warehouse_staff')
        .eq('id', userId)
        .single()

      if (profile?.is_warehouse_staff || profile?.role === 'warehouse_staff') return '/admin/warehouse/orders'
      if (profile?.role === 'admin') return '/admin/dashboard'
    } catch {
      // Profile query failed — auth metadata already checked above
    }

    return next
  }

  // 1. Handle Token Hash (from Email Confirmations)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const forwardTo = await getForwardUrl(user.id)
        return NextResponse.redirect(`${origin}${forwardTo}`)
      }
    } else {
      return NextResponse.redirect(`${origin}/login?error=Invalid_or_expired_link`)
    }
  }

  // 2. Handle Code (from Google OAuth or PKCE Email Confirmation)
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const forwardTo = await getForwardUrl(data.user.id)
      return NextResponse.redirect(`${origin}${forwardTo}`)
    } else {
      return NextResponse.redirect(`${origin}/login?error=Invalid_or_expired_link`)
    }
  }

  return NextResponse.redirect(redirectUrl)
}
