import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  if (pathname.startsWith('/auth/callback')) return supabaseResponse

  // Check if user has verified their email
  const isVerified = user ? !!user.email_confirmed_at : false;

  // If already logged in and hitting login/signup, redirect to dashboard based on role
  if (user && isVerified && (pathname === '/login' || pathname === '/signup')) {
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
    if (!user || !isVerified) {
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
    if (!user || !isVerified) {
      return NextResponse.redirect(new URL('/login?error=verify_required', request.url))
    }
  }

  return supabaseResponse
}
