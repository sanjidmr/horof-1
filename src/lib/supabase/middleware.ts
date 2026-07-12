import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from './public-env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const env = getSupabasePublicEnv()
  if (!env) {
    console.error('[Supabase Middleware] Cannot update session: Missing environment variables.')
  }

  const supabase = createServerClient(
    env?.url || '',
    env?.anonKey || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('[Supabase Middleware] Error fetching user session:', error)
  }


  // 1. Route Protection Logic
  const pathname = request.nextUrl.pathname

  // Redirect legacy /dashboard to /customer/dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/customer/dashboard', request.url))
  }
  if (pathname.startsWith('/dashboard/')) {
    const newPath = pathname.replace('/dashboard/', '/customer/')
    return NextResponse.redirect(new URL(newPath, request.url))
  }

  // Public routes that don't need auth check redirects
  if (pathname.startsWith('/auth/')) return supabaseResponse

  // Check if user has verified their email
  const isVerified = user ? !!user.email_confirmed_at : false;

  // If already logged in and hitting login/signup, redirect to dashboard based on role
  if (user && isVerified && (pathname === '/login' || pathname === '/signup' || pathname === '/register')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'
    return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : '/customer/dashboard', request.url))
  }

  // Admin protection
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!isVerified) {
      if (user.email) {
        return NextResponse.redirect(new URL(`/verify-otp?email=${encodeURIComponent(user.email)}`, request.url))
      }
      return NextResponse.redirect(new URL('/login?error=verify_required', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/customer/dashboard', request.url))
    }
  }

  // Customer protection
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/customer')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!isVerified) {
      if (user.email) {
        return NextResponse.redirect(new URL(`/verify-otp?email=${encodeURIComponent(user.email)}`, request.url))
      }
      return NextResponse.redirect(new URL('/login?error=verify_required', request.url))
    }
  }

  return supabaseResponse
}
