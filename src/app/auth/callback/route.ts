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

  // Default error fallback
  let redirectUrl = `${origin}/login?error=Could_not_authenticate`

  const getForwardUrl = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const role = profile?.role || 'customer'
    if (role === 'admin') return '/admin/dashboard'
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

  // If we reach here, neither code nor token_hash was valid
  return NextResponse.redirect(redirectUrl)
}
