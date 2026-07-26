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

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('[Supabase Middleware] Error fetching user session:', error)
  }

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

  const isVerified = user ? !!user.email_confirmed_at : false;

  // Helper: detect warehouse staff from auth user metadata
  const isWarehouseStaffFromMeta = (u: typeof user): boolean => {
    const meta = u?.user_metadata || {};
    const appMeta = u?.app_metadata || {};
    return meta.is_warehouse_staff === true || appMeta.is_warehouse_staff === true;
  };

  const isAdminFromMeta = (u: typeof user): boolean => {
    const meta = u?.user_metadata || {};
    const appMeta = u?.app_metadata || {};
    return meta.role === 'admin' || appMeta.role === 'admin';
  };

  // If already logged in and hitting login/signup, redirect based on role
  if (user && isVerified && (pathname === '/login' || pathname === '/signup' || pathname === '/register')) {
    // Check auth metadata first (instant, no DB needed)
    if (isWarehouseStaffFromMeta(user)) {
      return NextResponse.redirect(new URL('/admin/warehouse/orders', request.url))
    }
    if (isAdminFromMeta(user)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Fallback to DB profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_warehouse_staff')
      .eq('id', user.id)
      .single()

    if (profile?.is_warehouse_staff || profile?.role === 'warehouse_staff') {
      return NextResponse.redirect(new URL('/admin/warehouse/orders', request.url))
    }
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Default customer
    return NextResponse.redirect(new URL('/customer/dashboard', request.url))
  }

  // Check is_banned for all authenticated routes
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned, is_warehouse_staff')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=banned', request.url))
    }

    // Admin/warehouse staff protection for /admin routes
    if (pathname.startsWith('/admin')) {
      if (!isVerified) {
        if (user.email) {
          return NextResponse.redirect(new URL(`/verify-otp?email=${encodeURIComponent(user.email)}`, request.url))
        }
        return NextResponse.redirect(new URL('/login?error=verify_required', request.url))
      }

      const isWarehouseStaff = isWarehouseStaffFromMeta(user) || profile?.is_warehouse_staff === true || profile?.role === 'warehouse_staff';
      const isAdmin = isAdminFromMeta(user) || profile?.role === 'admin';

      if (!isAdmin && !isWarehouseStaff) {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url))
      }

      // Warehouse staff: only allow /admin/warehouse/* and /admin/dashboard
      if (isWarehouseStaff && !isAdmin) {
        const isAllowed = pathname.startsWith('/admin/warehouse') || pathname.startsWith('/admin/dashboard');
        if (!isAllowed) {
          return NextResponse.redirect(new URL('/admin/warehouse/orders', request.url))
        }
      }
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
